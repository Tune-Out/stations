import { createHash } from 'node:crypto';

export const SHARD_LEN = 2;

/**
 * UUIDs in the wild often share common prefixes (radio-browser's pre-v4
 * generation reused timestamps). Sharding on the raw prefix yields a max of
 * ~4.7k entries in a single shard, blowing past the 500-per-shard target.
 * We instead hash the UUID and take 2 hex chars (256 uniform buckets).
 */
export function shardForUuid(uuid: string): string {
  return createHash('sha1').update(uuid).digest('hex').slice(0, SHARD_LEN);
}

export function yamlPathForUuid(uuid: string): string {
  return `data/stations/${shardForUuid(uuid)}/${uuid}.yaml`;
}

export function urlForUuid(uuid: string): string {
  return `/stations/${shardForUuid(uuid)}/${uuid}/`;
}

export function allShards(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 256; i++) out.push(i.toString(16).padStart(2, '0'));
  return out;
}
