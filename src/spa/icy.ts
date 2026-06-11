/**
 * Side-channel ICY metadata reader.
 *
 * Most internet-radio (Shoutcast / Icecast) streams interleave a small
 * length-prefixed metadata block ("StreamTitle='Artist - Song';") into the
 * audio bytes when the client requests it via the `Icy-MetaData: 1` header
 * and the server advertises `icy-metaint: N`. The browser's `<audio>`
 * element strips this header and won't surface the metadata to JS — even
 * if it did, parsing the interleaved bytes requires reading the body
 * stream byte-by-byte, which the media stack hides.
 *
 * Strategy here: open a *separate* `fetch()` connection to the same stream
 * URL with `Icy-MetaData: 1`, parse the first metadata block we see, and
 * cancel the connection. We do this every {@link REFRESH_MS} milliseconds
 * so song changes are picked up without keeping a second download running
 * for the whole listening session.
 *
 * Real-world constraints:
 *   • CORS — most Icecast servers don't include `Access-Control-Allow-Origin`,
 *     so the fetch is rejected before we see any bytes. Nothing we can do
 *     from the page; the reader silently gives up and the player falls
 *     back to showing just the station name. The well-behaved servers
 *     (SomaFM, BBC, most pro-broadcaster icecast deployments, many
 *     radio-paradise endpoints) do return CORS headers.
 *   • Mixed content — an HTTPS page can't fetch() an http:// stream URL,
 *     even though `<audio>` is allowed to. Same silent-failure path.
 *   • `audio/aac` raw streams without `icy-metaint` (some HLS / DASH /
 *     direct-AAC sources): no metadata available; reader is a no-op.
 *
 * The reader never throws to its caller — failures resolve to "no metadata"
 * because the player should keep working regardless.
 */

const REFRESH_MS = 30_000;
const READ_BUDGET_MS = 8_000;

type StateMachine = 0 | 1 | 2;
const S_AUDIO  = 0 satisfies StateMachine;
const S_LEN    = 1 satisfies StateMachine;
const S_META   = 2 satisfies StateMachine;

export interface IcyTrack {
  /** Raw `StreamTitle=` payload, e.g. `"Artist Name - Song Title"`. */
  raw: string;
  /** Heuristic split: if `raw` contains " - ", everything before is the artist. */
  artist?: string;
  /** Heuristic split: the rest after " - ", or the whole `raw` when there's no dash. */
  title?: string;
}

/**
 * Read exactly one ICY metadata snapshot from `streamUrl`, then cancel the
 * underlying connection. Returns the parsed `IcyTrack` on success, or
 * `null` if anything went wrong (CORS, no metaint, no metadata before the
 * budget elapsed, etc.). Aborting via `signal` short-circuits the wait.
 */
export async function readIcyMetadataSnapshot(
  streamUrl: string,
  signal: AbortSignal,
): Promise<IcyTrack | null> {
  let res: Response;
  try {
    res = await fetch(streamUrl, {
      // Most Icecast servers serve metadata over plain HTTP. CORS mode is
      // required so we can READ `icy-metaint` from the response headers.
      headers: { 'Icy-MetaData': '1' },
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal,
    });
  } catch {
    return null;
  }
  const metaIntRaw = res.headers.get('icy-metaint');
  const metaInt = metaIntRaw ? parseInt(metaIntRaw, 10) : 0;
  if (!res.body || !isFinite(metaInt) || metaInt <= 0) {
    try { await res.body?.cancel(); } catch { /* already gone */ }
    return null;
  }
  const reader = res.body.getReader();
  const deadline = Date.now() + READ_BUDGET_MS;

  let state: StateMachine = S_AUDIO;
  let needAudio = metaInt;
  let needMeta = 0;
  let metaBuf = new Uint8Array(0);
  let metaBufFill = 0;
  let found: string | null = null;

  try {
    outer: while (Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      let i = 0;
      while (i < value.length) {
        if (state === S_AUDIO) {
          // Audio bytes are skipped without buffering — the reader is a
          // sniffer, not a player.
          const skip = Math.min(value.length - i, needAudio);
          i += skip;
          needAudio -= skip;
          if (needAudio === 0) state = S_LEN;
        } else if (state === S_LEN) {
          // One-byte length prefix; the metadata block is `len * 16` bytes
          // long (zero-padded at the tail).
          needMeta = value[i]! * 16;
          i += 1;
          if (needMeta === 0) {
            // Server sent an empty block — no metadata change yet. Loop on
            // for the next batch (some streams send several empties before
            // the first real title).
            state = S_AUDIO;
            needAudio = metaInt;
          } else {
            state = S_META;
            metaBuf = new Uint8Array(needMeta);
            metaBufFill = 0;
          }
        } else {
          const take = Math.min(value.length - i, needMeta - metaBufFill);
          metaBuf.set(value.subarray(i, i + take), metaBufFill);
          metaBufFill += take;
          i += take;
          if (metaBufFill === needMeta) {
            const text = new TextDecoder('utf-8', { fatal: false }).decode(metaBuf);
            const title = parseStreamTitle(text);
            if (title) {
              found = title;
              break outer;
            }
            state = S_AUDIO;
            needAudio = metaInt;
          }
        }
      }
    }
  } catch {
    /* aborted / network / reader killed */
  }
  try { await reader.cancel(); } catch { /* ignored */ }

  return found ? splitTrack(found) : null;
}

/** Pull `StreamTitle='…'` (single- or double-quoted) out of an ICY block. */
function parseStreamTitle(block: string): string | null {
  // Tolerate either quote style and a trailing `\0`-padding.
  const m = /StreamTitle\s*=\s*(['"])([^'"]*)\1/.exec(block);
  if (!m) return null;
  const raw = m[2]!.trim();
  return raw || null;
}

/** Heuristic "Artist - Title" split (preserves the raw payload). */
function splitTrack(raw: string): IcyTrack {
  // Many stations send "Artist - Title"; some send "Title - Artist"; jingles
  // and station IDs may send a single string with no dash. We split on the
  // first " - " (with surrounding spaces) so titles with embedded hyphens
  // ("Let It Be - Remastered") survive intact in the title field.
  const m = /^([^–—\-]+?)\s+[\-–—]\s+(.+)$/.exec(raw);
  if (m) return { raw, artist: m[1]!.trim(), title: m[2]!.trim() };
  return { raw, title: raw };
}

/**
 * Long-running metadata watcher. Calls `onTrack` whenever a new title is
 * observed; calls `onGiveUp` once if the FIRST snapshot fails so the caller
 * can stop trying (e.g., update UI to hide the placeholder spinner). The
 * returned function aborts any in-flight fetch and clears the refresh timer.
 */
export function watchIcyMetadata(
  streamUrl: string,
  onTrack: (track: IcyTrack) => void,
  onGiveUp?: () => void,
): () => void {
  let aborted = false;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRaw: string | null = null;

  const tick = async () => {
    if (aborted) return;
    controller = new AbortController();
    const snap = await readIcyMetadataSnapshot(streamUrl, controller.signal);
    if (aborted) return;
    if (snap) {
      if (snap.raw !== lastRaw) {
        lastRaw = snap.raw;
        onTrack(snap);
      }
      timer = setTimeout(tick, REFRESH_MS);
    } else if (lastRaw == null) {
      // First attempt produced nothing — likely CORS, mixed-content, or a
      // stream without ICY. No point retrying; the player keeps its
      // station-name-only display.
      onGiveUp?.();
    } else {
      // We've succeeded before; transient failure, try again next cycle.
      timer = setTimeout(tick, REFRESH_MS);
    }
  };

  void tick();

  return () => {
    aborted = true;
    controller?.abort();
    if (timer != null) clearTimeout(timer);
  };
}
