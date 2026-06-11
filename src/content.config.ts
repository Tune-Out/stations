// Astro content collection is no longer used at runtime (the site is a SPA
// fed by SQLite), but the schema definition here keeps the shape documented
// and importable by tooling. The build pipeline reads YAML via the Zod
// schema in scripts/lib/schema.ts.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { SUPPORTED_LOCALES } from './locales.js';

const LocalizedEntry = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

const dateToString = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString() : v ?? ''),
  z.string().default(''),
);

const stationSchema = z.object({
  stationuuid: z.string(),
  name: z.string(),
  url: z.string().default(''),
  url_resolved: z.string().default(''),
  homepage: z.string().default(''),
  favicon: z.string().default(''),
  tags: z.array(z.string()).default([]),
  country: z.string().default(''),
  countrycode: z.string().default(''),
  state: z.string().default(''),
  language: z.array(z.string()).default([]),
  languagecodes: z.array(z.string()).default([]),
  votes: z.number().default(0),
  codec: z.string().default(''),
  bitrate: z.number().default(0),
  hls: z.boolean().default(false),
  lastcheckok: z.boolean().default(false),
  lastchangetime: dateToString,
  clickcount: z.number().default(0),
  geo_lat: z.number().nullable().default(null),
  geo_long: z.number().nullable().default(null),
  localized: z.record(
    // Cast through `as unknown` because Zod's `z.enum` insists on a
    // string-literal-mutable-array, while SUPPORTED_LOCALES is a readonly
    // const tuple. The runtime value is the same.
    z.enum(SUPPORTED_LOCALES as unknown as [string, ...string[]]),
    LocalizedEntry,
  ).optional(),
});

const stations = defineCollection({
  loader: glob({
    pattern: '**/*.yaml',
    base: './data/stations',
    generateId: ({ entry }) => {
      const m = entry.match(/([^/\\]+)\.yaml$/);
      return m ? m[1]! : entry;
    },
  }),
  schema: stationSchema,
});

export const collections = { stations };
