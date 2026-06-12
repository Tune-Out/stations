/**
 * Tiny reactive primitives — no framework.
 *
 * signal<T>(initial)        → a reactive holder with get / set / subscribe
 * effect(fn)                → runs fn now and again whenever any signal it
 *                              read inside changes; returns a dispose fn
 * persisted<T>(key, initial) → a signal that mirrors to localStorage
 *
 * Effects track dependencies dynamically via a small running-effect stack.
 */
import type { Locale, NowPlaying, StationRef } from './types.js';

type Listener<T> = (value: T) => void;
type EffectFn = () => void;

let currentEffect: EffectFn | null = null;

export interface Signal<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: Listener<T>): () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subs = new Set<Listener<T>>();
  const effects = new Set<EffectFn>();
  return {
    get() {
      if (currentEffect) effects.add(currentEffect);
      return value;
    },
    set(next) {
      const v = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      if (Object.is(v, value)) return;
      value = v;
      for (const fn of subs) fn(value);
      for (const fn of effects) fn();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => { subs.delete(fn); };
    },
  };
}

export function effect(fn: EffectFn): () => void {
  let disposed = false;
  const wrapped: EffectFn = () => {
    if (disposed) return;
    const prev = currentEffect;
    currentEffect = wrapped;
    try { fn(); } finally { currentEffect = prev; }
  };
  wrapped();
  return () => { disposed = true; };
}

export function persisted<T>(key: string, initial: T): Signal<T> {
  let start = initial;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) start = JSON.parse(raw) as T;
    } catch { /* ignore corrupt entries */ }
  }
  const s = signal<T>(start);
  s.subscribe((v) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ }
  });
  return s;
}

// ─── App state ─────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';
/** Visual skin id (classic, minimal, solarpunk, …). Loaded from public/themes/index.json. */
export type Skin = string;

export const locale = signal<Locale>('en');
export const theme = persisted<Theme>('tuneout.theme', 'system');
export const skin = persisted<Skin>('tuneout.skin', 'classic');

export const recents = persisted<StationRef[]>('tuneout.recents', []);
export const favorites = persisted<StationRef[]>('tuneout.favorites', []);
export const volume = persisted<number>('tuneout.volume', 0.85);

/** Persisted collapse/expand state for the sidebar list groups. */
export const sidebarRecentsOpen   = persisted<boolean>('tuneout.sidebar.recents.open',   true);
export const sidebarFavoritesOpen = persisted<boolean>('tuneout.sidebar.favorites.open', true);

export const current = signal<StationRef | null>(null);
export const playing = signal<boolean>(false);
export const nowPlaying = signal<NowPlaying>({});

/**
 * Playback lifecycle status. Drives the Play button affordance: while
 * 'connecting' the button shows a spinner and is disabled; on 'error' the
 * player surfaces the message; otherwise the icon toggles between play/pause.
 */
export type PlayerStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';
export const playerStatus = signal<PlayerStatus>('idle');
export const playerError = signal<string | null>(null);

export type DbStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; received: number; total: number }
  | { kind: 'opening' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

export const dbStatus = signal<DbStatus>({ kind: 'idle' });

/** Hard floor + ceiling so a manually-edited localStorage value can't break
 *  the sidebar (empty list / runaway memory). */
export const RECENTS_MAX_FLOOR = 5;
export const RECENTS_MAX_CEILING = 500;
export const RECENTS_MAX_DEFAULT = 50;
/** User-configurable cap on the recents list. Live signal so the Settings
 *  page can rewrite it and pushRecent / the sidebar update immediately. */
export const recentsMax = persisted<number>('tuneout.recents.max', RECENTS_MAX_DEFAULT);

function clampRecentsMax(n: number): number {
  if (!Number.isFinite(n)) return RECENTS_MAX_DEFAULT;
  return Math.max(RECENTS_MAX_FLOOR, Math.min(RECENTS_MAX_CEILING, Math.floor(n)));
}

export function setRecentsMax(n: number): void {
  const clamped = clampRecentsMax(n);
  recentsMax.set(clamped);
  // Trim immediately if the new cap is smaller than the current list.
  recents.set((prev) => prev.slice(0, clamped));
}

export function clearRecents(): void {
  recents.set([]);
}

export function pushRecent(ref: StationRef): void {
  const cap = clampRecentsMax(recentsMax.get());
  recents.set((prev) => {
    const without = prev.filter((r) => r.uuid !== ref.uuid);
    return [ref, ...without].slice(0, cap);
  });
}

export function toggleFavorite(ref: StationRef): boolean {
  let nowFav = false;
  favorites.set((prev) => {
    const exists = prev.some((r) => r.uuid === ref.uuid);
    nowFav = !exists;
    return exists ? prev.filter((r) => r.uuid !== ref.uuid) : [ref, ...prev];
  });
  return nowFav;
}

export function isFavorite(uuid: string): boolean {
  return favorites.get().some((r) => r.uuid === uuid);
}

export function findKnownStation(uuid: string): StationRef | undefined {
  const lists = [recents.get(), favorites.get()];
  for (const list of lists) {
    const hit = list.find((r) => r.uuid === uuid);
    if (hit) return hit;
  }
  return undefined;
}
