=======
# Tune Out Catalog

A beautiful, searchable browser for ~60,000 internet radio stations.

- Per-station page generated from a YAML source-of-truth (one file per station, sharded by UUID prefix).
- Full-text site search via Pagefind.
- Downloadable artifacts: SQLite (with FTS5), zipped YAML, gzipped JSON.
- Built-in `/player/` with Recents, Favorites, Collections (localStorage), plus best-effort now-playing metadata and album art.
- Static. Free. Public domain (CC0-1.0).

## Local development

```bash
npm install
npm run seed          # one-time: downloads radio-browser /all.json, writes data/stations/{shard}/{uuid}.yaml
npm run build:data    # produces public/data/{stations.sqlite,stations.zip,stations.json.gz,manifest.json}
npm run dev           # http://localhost:4321
npm run build         # full static build (also runs build:data via prebuild)
npm run preview       # serve dist/
```

The seed downloads ~400 MB from a radio-browser mirror; it takes a few minutes.
Pass `--limit=N` to seed only the first N stations during local development.

## Repo layout

See [the implementation plan](./PLAN.md) (or `~/.claude/plans/fancy-giggling-moler.md`)
for the full architecture. Short version:

```
data/stations/{shard}/{uuid}.yaml    # source of truth (60k files, 256 shards)
scripts/                              # TypeScript build tooling
src/                                  # Astro site
public/data/                          # generated artifacts (gitignored)
.github/workflows/site.yml            # PR validates; main deploys to Pages
```

## License

[CC0-1.0](./LICENSE) — public domain.
The radio-browser data we redistribute is itself public-domain.
# stations
