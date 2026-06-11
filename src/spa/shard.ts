/**
 * Browser-side shard hash, matching `scripts/lib/shard.ts` (SHA-1 prefix).
 * Web Crypto is async; we cache results in memory for repeat lookups.
 * Edit-on-GitHub links can call this eagerly during render via a small
 * synchronous fallback that uses FNV-1a temporarily, then upgrade once
 * the real hash is available.
 *
 * Most callers, though, already have the shard alongside the UUID
 * (from the SQLite row's `shard` column), so they should pass it
 * directly via stationUrl(uuid, shard) and skip the hash entirely.
 */
import type { Locale } from './types.js';
export const SHARD_LEN = 2;

const cache = new Map<string, string>();

export async function shardForUuid(uuid: string): Promise<string> {
  const hit = cache.get(uuid);
  if (hit) return hit;
  const enc = new TextEncoder().encode(uuid);
  const buf = await crypto.subtle.digest('SHA-1', enc);
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const out = hex.slice(0, SHARD_LEN);
  cache.set(uuid, out);
  return out;
}

export function stationUrl(uuid: string, shard: string, locale: Locale): string {
  return `/${locale}/station/${uuid}`;
}

export function editOnGithubUrl(uuid: string, shard: string): string {
  const owner = (import.meta.env.PUBLIC_GH_OWNER as string | undefined) ?? 'tune-out';
  const repo = (import.meta.env.PUBLIC_GH_REPO as string | undefined) ?? 'catalog';
  const branch = (import.meta.env.PUBLIC_GH_BRANCH as string | undefined) ?? 'main';
  return `https://github.com/${owner}/${repo}/edit/${branch}/data/stations/${shard}/${uuid}.yaml`;
}

export function repoUrl(): string {
  const owner = (import.meta.env.PUBLIC_GH_OWNER as string | undefined) ?? 'tune-out';
  const repo = (import.meta.env.PUBLIC_GH_REPO as string | undefined) ?? 'catalog';
  return `https://github.com/${owner}/${repo}`;
}
