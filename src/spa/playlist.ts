/**
 * PLS (.pls) playlist generation + browser download.
 *
 * The PLS format is the [Winamp / Shoutcast] playlist format:
 *
 *     [playlist]
 *     NumberOfEntries=2
 *     File1=http://stream.example.com/listen.pls
 *     Title1=Some Station
 *     Length1=-1
 *     File2=...
 *     Title2=...
 *     Length2=-1
 *     Version=2
 *
 * It's read by every desktop audio player worth mentioning (VLC, Foobar2000,
 * Winamp/Wacup, mpv, Rhythmbox, Audacious, …). We emit it with CRLF line
 * endings because that's what the historical clients expect — Foobar2000 in
 * particular is finicky about LF-only files.
 */
import type { StationRef } from './types.js';

/** Strip characters that would break a PLS line. PLS uses `key=value` with
 *  one entry per line; any CR/LF in the value would silently truncate or
 *  desync the subsequent lines. */
function sanitizeLine(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').trim();
}

export function refsToPls(refs: readonly StationRef[]): string {
  // Only entries with a real http(s) stream URL are exportable. Entries with
  // a missing `url` would produce `FileN=` empty lines that some clients
  // interpret as a broken playlist.
  const playable = refs.filter((r) => r.url && /^https?:\/\//i.test(r.url));
  const lines: string[] = ['[playlist]', `NumberOfEntries=${playable.length}`];
  playable.forEach((r, i) => {
    const n = i + 1;
    lines.push(`File${n}=${sanitizeLine(r.url)}`);
    lines.push(`Title${n}=${sanitizeLine(r.name || `Station ${n}`)}`);
    // -1 = stream of unknown length; the spec uses this for everything that
    // isn't a fixed-duration media file.
    lines.push(`Length${n}=-1`);
  });
  lines.push('Version=2');
  // Trailing newline matters for some parsers.
  return lines.join('\r\n') + '\r\n';
}

/**
 * Trigger a browser download of `contents` as the given filename.
 * Creates a transient `<a download>` element backed by a Blob URL; revokes
 * the URL after the click fires so the Blob doesn't leak.
 */
export function downloadFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Synchronous click() schedules the download; revoke on the next tick so
  // the browser has a chance to grab the URL first.
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(href);
  }, 0);
}

/** Convenience: build a `.pls` from a list of station refs and trigger the
 *  browser download. Filename defaults to `<name>.pls`. */
export function exportPls(name: string, refs: readonly StationRef[]): void {
  const safeName = name.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'playlist';
  downloadFile(`${safeName}.pls`, refsToPls(refs), 'audio/x-scpls');
}
