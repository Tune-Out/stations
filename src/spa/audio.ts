import {
  current, nowPlaying, playerError, playerStatus, playing, pushRecent, volume,
} from './store.js';
import type { StationRef } from './types.js';
import { watchIcyMetadata } from './icy.js';

let stationFavicon = '';
let audioEl: HTMLAudioElement | null = null;
let attemptId = 0; // increments on each play() — lets stale events drop themselves
let stopMetadata: (() => void) | null = null;

function el(): HTMLAudioElement {
  if (audioEl) return audioEl;
  const a = document.createElement('audio');
  a.preload = 'none';
  // We deliberately do NOT set `crossOrigin = 'anonymous'`. With a hard CORS
  // requirement, streams that redirect through CDNs which omit CORS headers
  // on a hop (or that don't echo the request mode) fail with errors like
  // "The operation was aborted." For a radio player we never need pixel
  // access (no canvas/WebAudio analysis), so anonymous mode just shrinks the
  // set of streams that play.
  a.addEventListener('playing', () => {
    playing.set(true);
    playerStatus.set('playing');
    playerError.set(null);
  });
  a.addEventListener('waiting', () => {
    // mid-stream buffering — treat as "connecting" so the UI hints at it
    if (playerStatus.get() === 'playing') playerStatus.set('connecting');
  });
  a.addEventListener('canplay', () => {
    playerError.set(null);
  });
  a.addEventListener('pause', () => {
    playing.set(false);
    if (playerStatus.get() === 'playing' || playerStatus.get() === 'connecting') {
      playerStatus.set('paused');
    }
  });
  a.addEventListener('ended', () => {
    playing.set(false);
    playerStatus.set('idle');
  });
  a.addEventListener('error', () => {
    // Suppress error events during the icecast→raw-audio transition: while a
    // play attempt is being torn down (next attemptId), an error fired by the
    // outgoing element is noise.
    if (suppressErrorsUntil > Date.now()) return;
    const code = a.error?.code;
    // code 1 = MEDIA_ERR_ABORTED. The most common cause is our own teardown
    // calling pause()/load() while a play() was in flight — not a user-
    // visible failure.
    if (code === 1) return;
    let msg = 'Stream unavailable.';
    if (code === 2) msg = 'Network error reaching the stream.';
    else if (code === 3) msg = 'Stream is corrupt or unreadable.';
    else if (code === 4) msg = 'Stream format not supported by this browser.';
    playerError.set(msg);
    playerStatus.set('error');
    playing.set(false);
  });
  a.addEventListener('volumechange', () => {
    if (a.volume !== volume.get()) volume.set(a.volume);
  });
  a.volume = volume.get();
  document.body.appendChild(a);
  audioEl = a;
  return a;
}

/** Suppress `audio` error events that fire while we're tearing down. */
let suppressErrorsUntil = 0;

export async function play(ref: StationRef): Promise<void> {
  const myAttempt = ++attemptId;
  current.set(ref);
  pushRecent(ref);
  stationFavicon = ref.favicon ?? '';
  nowPlaying.set({ artworkUrl: stationFavicon });
  playerError.set(null);
  playerStatus.set('connecting');

  const audio = el();

  // The tear-down below — pause(), removeAttribute('src'), load() — can raise
  // an `error` event on the audio element while a previous src is being
  // ripped out. Suppress those for a short window so a stale teardown
  // doesn't paint the UI red.
  suppressErrorsUntil = Date.now() + 1500;

  audio.pause();
  audio.removeAttribute('src');
  try { audio.load(); } catch { /* ignore — some browsers throw on no-source load */ }

  if (!ref.url) {
    if (myAttempt !== attemptId) return;
    playerError.set('No stream URL listed for this station.');
    playerStatus.set('error');
    playing.set(false);
    return;
  }

  // ── Playback ───────────────────────────────────────────────────────────
  // Native <audio> only — see history note below. We previously attached
  // icecast-metadata-player to the same element for ICY metadata
  // extraction; even with `playbackMethod: 'html5'`, the library installs
  // its own listeners and resets `src`/calls `pause()` during construction,
  // which silently killed playback for many otherwise-healthy streams
  // (e.g. Radio Paradise's `stream-uk1.radioparadise.com/aac-320`). The
  // metadata reader now lives in `icy.ts` and runs on a separate fetch()
  // connection, so the audio element is never touched.
  audio.src = ref.url;
  audio.volume = volume.get();
  try {
    await audio.play();
  } catch (e) {
    if (myAttempt !== attemptId) return;
    // AbortError fires when something paused the element before the play
    // promise resolved — usually our own next play() attempt; suppress.
    const name = (e as Error)?.name;
    if (name === 'AbortError') return;
    playerError.set((e as Error)?.message || 'Could not start the stream.');
    playerStatus.set('error');
    playing.set(false);
    return;
  }

  // ── Metadata side-channel ──────────────────────────────────────────────
  // Start the ICY watcher AFTER playback is established so the player
  // doesn't share its first-byte window with a competing connection. The
  // watcher silently fails on CORS / mixed-content / non-ICY streams; on
  // success it updates `nowPlaying.artist`/`title` every ~30s. We don't
  // gate updates on attemptId here because the watcher itself captures
  // `myAttempt` via the closure below and aborts on teardown.
  stopMetadata?.();
  stopMetadata = watchIcyMetadata(
    ref.url,
    (track) => {
      if (myAttempt !== attemptId) return;
      nowPlaying.set({
        artist: track.artist,
        title: track.title,
        raw: track.raw,
        artworkUrl: stationFavicon,
      });
    },
  );
}

export function togglePlay(): void {
  const audio = el();
  const c = current.get();
  if (audio.paused) {
    if (c) {
      if (playerStatus.get() === 'error') {
        // user retrying — full re-attempt
        void play(c);
      } else {
        playerStatus.set('connecting');
        audio.play().catch((e) => {
          if ((e as Error)?.name === 'AbortError') return;
          playerError.set((e as Error)?.message || 'Could not resume playback.');
          playerStatus.set('error');
        });
      }
    }
  } else {
    audio.pause();
  }
}

export function setVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, v));
  el().volume = clamped;
  volume.set(clamped);
}
