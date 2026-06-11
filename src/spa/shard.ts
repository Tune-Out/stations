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

// Defaults match the station-data repo (Tune-Out/stations). Override via the
// build env (PUBLIC_GH_OWNER / PUBLIC_GH_REPO / PUBLIC_GH_BRANCH) if you fork.
const DEFAULT_OWNER  = 'Tune-Out';
const DEFAULT_REPO   = 'stations';
const DEFAULT_BRANCH = 'main';

function ghOwner():  string { return (import.meta.env.PUBLIC_GH_OWNER  as string | undefined) ?? DEFAULT_OWNER; }
function ghRepo():   string { return (import.meta.env.PUBLIC_GH_REPO   as string | undefined) ?? DEFAULT_REPO; }
function ghBranch(): string { return (import.meta.env.PUBLIC_GH_BRANCH as string | undefined) ?? DEFAULT_BRANCH; }

export function editOnGithubUrl(uuid: string, shard: string): string {
  // GitHub's web editor flow: opening this URL drops the user into an edit
  // view on the file. When they commit, GitHub redirects them to a "compare
  // & create pull request" page where the repo's
  // .github/pull_request_template.md is auto-loaded into the body.
  return `https://github.com/${ghOwner()}/${ghRepo()}/edit/${ghBranch()}/data/stations/${shard}/${uuid}.yaml`;
}

/** Read-only "View source" link for a station YAML (used by sourcing tools). */
export function viewOnGithubUrl(uuid: string, shard: string): string {
  return `https://github.com/${ghOwner()}/${ghRepo()}/blob/${ghBranch()}/data/stations/${shard}/${uuid}.yaml`;
}

/** Public URL of the PR template — links from the UI take the user here so
 *  they can read the questions before clicking through to "Edit". */
export function prTemplateUrl(): string {
  return `https://github.com/${ghOwner()}/${ghRepo()}/blob/${ghBranch()}/.github/pull_request_template.md`;
}

export function repoUrl(): string {
  return `https://github.com/${ghOwner()}/${ghRepo()}`;
}
