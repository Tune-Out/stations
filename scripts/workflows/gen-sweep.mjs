#!/usr/bin/env node
/**
 * Generate a sweep workflow script for stations that are still un-annotated
 * (no "# researched:" line in their YAML), regardless of clickcount range.
 *
 * Usage:
 *   node scripts/workflows/gen-sweep.mjs <wave-num> [batch-size=20] [model]
 *   → writes scripts/workflows/research-sweep<N>.js
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const waveNum = process.argv[2] || 'A';
const batchSize = Number(process.argv[3] || 20);
const model = process.argv[4] || '';

const db = new DatabaseSync('public/data/stations.sqlite');
const rows = db.prepare(`
  SELECT s.uuid, s.name, s.homepage, s.country, s.countrycode,
         s.clickcount, s.shard,
         (SELECT GROUP_CONCAT(t.slug, ',') FROM station_tags st JOIN tags t ON t.id = st.tag_id WHERE st.station_rowid = s.rowid) AS tags
  FROM stations s
  ORDER BY s.clickcount DESC, s.votes DESC, s.uuid
`).all();

const gaps = [];
for (const r of rows) {
  const path = `data/stations/${r.shard}/${r.uuid}.yaml`;
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (/^# researched:/m.test(content)) continue;
  gaps.push(r);
}

if (gaps.length === 0) {
  console.log('sweep: no gaps remaining — coverage complete');
  process.exit(0);
}

const trimmed = gaps.map((r) => {
  const tags = (r.tags || '').split(',').slice(0, 5).join(',');
  const name = (r.name || '').slice(0, 80);
  return {
    uuid: r.uuid, name, hp: r.homepage || '',
    cn: r.country || '', cc: r.countrycode || '',
    cl: r.clickcount || 0, sh: r.shard, tg: tags,
  };
});

const out = `export const meta = {
  name: 'station-research-sweep${waveNum}',
  description: 'Sweep ${gaps.length} un-annotated stations.',
  phases: [{ title: 'Sweep', detail: 'one agent per ${batchSize}-station batch' }],
};

const STATIONS = ${JSON.stringify(trimmed)};

const BATCH_SIZE = ${batchSize};
log(\`Sweep ${waveNum}: \${STATIONS.length} stations, batches of \${BATCH_SIZE}\`);

const batches = [];
for (let i = 0; i < STATIONS.length; i += BATCH_SIZE) {
  batches.push(STATIONS.slice(i, i + BATCH_SIZE));
}

function promptFor(batch, batchIdx) {
  const list = batch.map((s, i) => {
    const tags = (s.tg || '').split(',').filter(Boolean).slice(0, 8).join(', ') || '(none)';
    return \`  \${i + 1}. \${s.name}
     uuid: \${s.uuid}
     yaml_path: data/stations/\${s.sh}/\${s.uuid}.yaml
     country: \${s.cn || '(unknown)'} (\${s.cc || '?'})
     homepage: \${s.hp || '(none)'}
     tags: \${tags}
     clickcount: \${s.cl}\`;
  }).join('\\n\\n');

  return \`You are a research worker in a parallel pipeline annotating internet
radio station YAML files with deep, thorough, public-domain information.

Working directory: /opt/src/github/Tune-Out/catalog

Your batch (\${batch.length} stations, batch \${batchIdx + 1} of \${batches.length}):

\${list}

For EACH station in order, do this:

STEP 1 — IDEMPOTENCY CHECK
Read the yaml_path. If it already contains the line "# === Public research ==="
near the end, SKIP this station entirely (log it and move on). Do NOT redo work.

STEP 2 — RESEARCH
Use your own internal knowledge of the station, its parent organisation, its
country's broadcasting landscape, and cultural / political context. Optionally
do a single WebFetch on the homepage or one WebSearch query if needed. Don't
retry on failure — just continue without that source.

Be thorough about:
  - commercial vs non-commercial / public / state-funded status
  - parent company, group ownership, funding model
  - government / public-broadcaster ties
  - religious / political affiliations
  - audience demographic, language, region
  - programming format
  - history

If the station is too obscure to research meaningfully, be honest: write
"Unknown" for fields you can't substantiate. Never fabricate.

STEP 3 — APPEND
Use Edit (or Read + Write) to append exactly this comment block to the END
of the YAML file. Every line must start with "# ". Keep each value to a
single sentence; expand "notes" for richer history.

  # === Public research ===
  # researched: 2026-06-10
  # nature: [commercial | non-commercial | public broadcaster | community | state media | unknown]
  # operator: [parent company / operator name, or Unknown]
  # affiliations: [orgs / govt / religion / political movement, or "none known"]
  # audience: [target audience / region / language]
  # format: [one-line programming summary]
  # notes: [history, scale, awards, controversies, mission quote, etc.]
  # sources: [comma-separated URLs you actually used, or "internal knowledge only"]

STEP 4 — LOG
After each station, run Bash:
  echo "[sweep] OK: <Station Name> (<CC>)"
or "SKIP (already annotated): <name>" or "PARTIAL: <name> — <reason>".

CONSTRAINTS
- Process stations in the order listed.
- NEVER edit existing YAML fields; only append the new comment block.
- Don't introduce a blank line between existing content and the new comment.
- Keep each Edit/Write small.
- End your turn with: "Batch done: A annotated, B skipped, C partial."\`;
}

const results = await parallel(batches.map((batch, idx) => () =>
  agent(promptFor(batch, idx), {
    label: \`sweep \${idx + 1}: \${batch[0].name.slice(0, 26).trim()}\`,
    phase: 'Sweep',
    ${model ? `model: ${JSON.stringify(model)},` : ''}
  })
));

const ok = results.filter(Boolean).length;
log(\`Sweep ${waveNum} done — \${ok}/\${batches.length} batches\`);
return { sweep: '${waveNum}', batches_total: batches.length, batches_ok: ok, station_count: STATIONS.length };
`;

const outPath = resolve(`scripts/workflows/research-sweep${waveNum}.js`);
writeFileSync(outPath, out);
console.log(`wrote ${outPath}`);
console.log(`  gaps: ${gaps.length}`);
console.log(`  batches: ${Math.ceil(gaps.length / batchSize)}`);
console.log(`  script size: ${out.length} bytes`);
