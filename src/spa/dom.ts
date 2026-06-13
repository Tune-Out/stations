/**
 * Tiny DOM helpers — keeps the per-view render code tight without pulling
 * in a templating library.
 */

type EventMap = HTMLElementEventMap;
type Listener<K extends keyof EventMap> = (this: HTMLElement, ev: EventMap[K]) => unknown;

export interface ElProps {
  class?: string;
  id?: string;
  text?: string;
  html?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  on?: { [K in keyof EventMap]?: Listener<K> };
  children?: (Node | string | null | false | undefined)[];
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: ElProps = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (props.class) e.className = props.class;
  if (props.id) e.id = props.id;
  if (props.text !== undefined) e.textContent = props.text;
  if (props.html !== undefined) e.innerHTML = props.html;
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (v === false || v === null || v === undefined) continue;
      e.setAttribute(k, String(v));
    }
  }
  if (props.on) {
    for (const [k, fn] of Object.entries(props.on) as [keyof EventMap, Listener<keyof EventMap>][]) {
      e.addEventListener(k, fn as EventListener);
    }
  }
  if (props.children) {
    for (const c of props.children) {
      if (c === null || c === false || c === undefined) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
  }
  return e;
}

export function svg(d: string, w = 18, h = 18): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', String(w));
  s.setAttribute('height', String(h));
  s.setAttribute('fill', 'currentColor');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  s.appendChild(p);
  return s;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1f1e6, a = 0x41;
  const u = cc.toUpperCase();
  return String.fromCodePoint(A + (u.charCodeAt(0) - a), A + (u.charCodeAt(1) - a));
}

export function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Render a string with a tiny safe subset of Markdown:
 *
 *   `code`                → <code>code</code>
 *   [label](https://x.y)  → <a href rel target="_blank">label</a>
 *
 * All other HTML is escaped first, so a translator pasting `<script>` or
 * stray `<` characters can't inject markup. Link URLs are restricted to
 * http(s) — anything else (javascript:, data:, etc.) is rendered as
 * plain text so a malicious or buggy translation can't smuggle a URI
 * scheme. Use this for paragraph copy that mixes a single keyword like
 * `localized:` with external references.
 *
 *   markdownInline("See `localized:` in [the docs](https://example.com).");
 *   // → 'See <code>localized:</code> in <a href="https://example.com" …>the docs</a>.'
 */
export function markdownInline(s: string): string {
  let out = escapeHtml(s);
  // Links first so `code` inside link text still gets the code treatment
  // after we recurse the inner replace.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    if (!/^https?:\/\//i.test(href)) return _;  // unsupported scheme — leave as text
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" data-external="true">${label}</a>`;
  });
  // Backtick code spans
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return out;
}

/**
 * Replace `node`'s text with a middle-truncated version of `fullText` such
 * that the rendered content fits within node.clientWidth.
 *
 *   "United Kingdom" → "Un…om"  (when very tight)
 *   "United Kingdom" → "United…dom" (more relaxed)
 *
 * If the full text fits, it's set verbatim. Uses a binary search over the
 * surviving length because the relationship between character count and
 * rendered width is monotonic (longer string → ≥ rendered width).
 *
 * Idempotent: re-running it with the same `fullText` produces the same DOM
 * (so it's safe to call from a ResizeObserver without loop-protection).
 *
 * Requirements on the target node:
 *   - `overflow: hidden`
 *   - `white-space: nowrap`
 *   - inside a `flex: 1 1 0; min-width: 0` container so it actually shrinks
 */
export function middleTruncate(node: HTMLElement, fullText: string): void {
  node.textContent = fullText;
  if (node.scrollWidth <= node.clientWidth) return;

  // Binary-search the longest combined left+right length that still fits.
  let lo = 1, hi = fullText.length - 1;
  const apply = (n: number) => {
    const left = Math.ceil(n / 2);
    const right = n - left;
    node.textContent = fullText.slice(0, left) + '…' + (right ? fullText.slice(-right) : '');
  };
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    apply(mid);
    if (node.scrollWidth <= node.clientWidth) lo = mid;
    else                                      hi = mid - 1;
  }
  apply(lo);
}
