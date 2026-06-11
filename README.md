# Tune Out — stations

Internet-radio station catalog. The user-facing site is at
[tune-out.app](https://tune-out.app); the canonical data lives in this
repository at `data/stations/`.

## What's in the repository

```
data/stations/{shard}/{uuid}.yaml   ~57,000 per-station YAML files, sharded
                                    by the first two hex characters of the
                                    station UUID (256 directories)
src/                                Astro shell + vanilla-TypeScript SPA
src/locales.ts                      single source of truth for supported
                                    locales (codes, native names, page
                                    titles + descriptions)
src/spa/i18n/                       UI string + tag-label dictionaries per
                                    locale
src/pages/                          Astro static shells (one per locale)
scripts/                            TypeScript build tooling (tsx)
public/                             static assets (icons, manifest, themes,
                                    service worker)
themes/                             optional visual skins, applied at run
                                    time via a stylesheet swap
.github/workflows/site.yml          CI: tests, YAML lint, build, deploy
tests/                              vitest unit tests
tests-e2e/                          Playwright tests (mobile-fit regression)
```

`public/data/` is generated at build time and is gitignored.

## Architecture

The site is a single-page app. Astro is used only to emit a small static
shell per locale (`/en/`, `/fr/`, …) plus a root redirector and a 404 page
that doubles as the SPA fallback for unknown deep links.

The SPA boots from one of those shells and queries a local SQLite database
in the browser via `@sqlite.org/sqlite-wasm`. The database is downloaded
once (≈80 MB), cached in OPFS via the Cache API, and reused on subsequent
visits.

### Data pipeline

1. `data/stations/{shard}/{uuid}.yaml` is the source of truth.
   `scripts/lib/schema.ts` defines the Zod schema; `scripts/lib/canonical.ts`
   defines the canonical tag and language taxonomies.
2. `scripts/build-data.ts` reads every YAML, validates with Zod, and writes
   `public/data/stations.sqlite` — a single SQLite file with the normalized
   schema, FTS5 contentless index, and locale-specific name/description/
   keyword columns. The release build (`build:data:release`) additionally
   emits `stations.zip` and `stations.json.gz`.
3. `scripts/build-data.ts` also writes `public/data/manifest.json`
   (artifact sizes, SHA-256, build time, content hash) and
   `public/data/locales.json` (the runtime locale list, consumed by the
   service worker for shell pre-cache).
4. `scripts/build-tag-i18n.ts` reads `TAG_TRANSLATIONS` and writes the
   `tags` section of each `src/spa/i18n/<locale>.yaml` bundle in place,
   preserving the `strings` section (and per-key contributor comments) that
   contributors edit by hand. The runtime loads the YAML through a small
   Vite plugin defined in `astro.config.mjs`; no YAML parser ships to the
   browser.

### Client runtime

- Router: `src/spa/router.ts` — history API, internal-link interception.
  Routes are resolved client-side; deep links land on `404.html` (the SPA
  shell) and rehydrate.
- State: `src/spa/store.ts` — small signal store. Persisted slices
  (recents, favorites, theme, locale) sync to `localStorage`.
- DB layer: `src/spa/db.ts` — SQLite-WASM wrapper. All SQL is run on the
  main thread. Search uses FTS5; structured filters (tag, language,
  country, nature) use indexed JOINs.
- Audio: `src/spa/audio.ts` — native `<audio>` only.
- PWA: `public/sw.js` self-unregisters on dev hosts (`localhost`,
  `127.0.0.1`, `*.local`). In production it precaches the static shell,
  one HTML shell per supported locale (read from
  `/data/locales.json`), and uses stale-while-revalidate for other
  same-origin assets. Data files under `/data/*` are bypassed (the DB
  layer manages its own Cache API entry).

## Local development

Requires Node ≥22 (the build pipeline uses the built-in `node:sqlite`).

```bash
npm install
npm run seed         # one-time: pulls ~400 MB from radio-browser.info
                     #          and writes data/stations/{shard}/{uuid}.yaml
npm run build:data   # writes public/data/stations.sqlite + manifest.json
                     # + locales.json
npm run dev          # Vite dev server at http://localhost:4321
npm run build        # full static build into dist/
npm run preview      # serves dist/ at http://localhost:4321
```

`npm run seed` accepts `--limit=N` to seed only the first N stations.

Other scripts:

```
npm run build:data:release   # also emits stations.zip + stations.json.gz
npm run build:themes         # rebuilds public/themes/* from themes/
npm run build:tag-icons      # downloads Material Symbols SVGs for tag chips
npm run build:tag-i18n       # regenerates per-locale tag dictionaries
npm run migrate:yaml         # re-normalizes every YAML against canonical.ts
npm run lint:yaml            # local YAML linter (text output)
npm run lint:yaml:ci         # YAML linter with GitHub annotation output
npm test                     # vitest unit tests
npm run test:mobile          # Playwright mobile-fit regression suite
                             #   (requires `npx playwright install chromium`)
```

## Adding a new locale

1. Add a new entry to `src/locales.ts` (code, English name, native name,
   text direction, page title, page description).
2. Copy `src/spa/i18n/en.yaml` to `src/spa/i18n/<code>.yaml` and translate
   the values under the `strings` section, keeping every key intact. Each
   entry has a comment above it describing what the string is used for in
   the UI, plus the original English value once the new locale is created.
3. Add the new locale to `TAG_TRANSLATIONS` in
   `scripts/build-tag-i18n.ts` and run `npm run build:tag-i18n`. The
   script rewrites the `tags` section in place and leaves the `strings`
   section you translated alone.
4. Build and verify.

The build pipeline, router, linter, and service worker all read the locale
list from `src/locales.ts`; no other code changes are required.

## Deployment

Deployment runs on `main` via `.github/workflows/site.yml`. The workflow
has three jobs:

1. **tests** — installs dependencies, runs vitest unit tests, runs the
   YAML linter with GitHub annotation output. Runs on push and on PRs.
2. **build** — depends on `tests`. Restores the Astro + `public/data/`
   build cache keyed by the hash of `data/stations/**/*.yaml` and
   `package-lock.json`. Runs `npm run build:data:release` (writes
   sqlite + zip + json.gz + manifest.json + locales.json), then
   `astro build` via `withastro/action@v6`.
3. **deploy** — only on push to `main`. Uploads the Pages artifact and
   calls `actions/deploy-pages@v5`. The deployment URL comes from the
   `github-pages` environment.

The deployed site is served from `https://tune-out.app` via GitHub Pages
with a `CNAME` (configured in repository settings, not in this repo).

### Environment variables

| Variable | Default | Used by |
| --- | --- | --- |
| `SITE_URL` | `https://tune-out.app` | Astro `astro.config.mjs`, OG meta |
| `PUBLIC_GH_OWNER` | `Tune-Out` | "Edit on GitHub" link builder |
| `PUBLIC_GH_REPO` | `stations` | "Edit on GitHub" link builder |
| `PUBLIC_GH_BRANCH` | `main` | "Edit on GitHub" link builder |

### Node version

CI uses Node 22. `scripts/build-data.ts` imports `node:sqlite`, which is
provided behind `--experimental-sqlite` in Node ≥22.5 and unflagged in
newer releases. The flag is passed at the command line via the
`build:data` npm script (it's not allowed in `NODE_OPTIONS`).

## Contributing to a station record

Each station YAML has an "Edit on GitHub" affordance on its page on the
deployed site. Clicking it opens GitHub's web editor on the file. On
commit, GitHub creates a pull request using
`.github/pull_request_template.md`, which prompts the contributor for the
information we need (change type, source citations, authorization).

To contribute locally:

```bash
git clone https://github.com/Tune-Out/stations
cd stations
# edit data/stations/{shard}/{uuid}.yaml
npm run lint:yaml         # check against schema + canonical taxonomies
git commit && git push    # open a PR
```

## License

[CC0-1.0](./LICENSE). The upstream radio-browser metadata we redistribute
is itself public domain.
