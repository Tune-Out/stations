#!/usr/bin/env node
/**
 * Generate a research-wave workflow script for stations [offset, offset+limit).
 * Stations are queried from the SQLite in clickcount-desc order. Already
 * annotated stations are skipped at the agent level via an idempotency check.
 *
 * Usage:
 *   node scripts/workflows/gen-wave.mjs <wave-number> <offset> <limit>
 *   → writes scripts/workflows/research-wave<N>.js
 */
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const waveNum = process.argv[2];
const offset = Number(process.argv[3]);
const limit = Number(process.argv[4]);
const batchSize = Number(process.argv[5] || 10);
const model = process.argv[6] || ''; // optional Claude model id (e.g. claude-haiku-4-5-20251001)
if (!waveNum || Number.isNaN(offset) || Number.isNaN(limit)) {
  console.error('usage: gen-wave.mjs <wave-num> <offset> <limit> [batch-size=10] [model]');
  process.exit(2);
}

const db = new DatabaseSync('public/data/stations.sqlite');
const rows = db.prepare(`
  SELECT s.uuid, s.name, s.homepage, s.country, s.countrycode, s.codec,
         s.bitrate, s.clickcount, s.votes, s.shard,
         (SELECT GROUP_CONCAT(t.slug, ',') FROM station_tags st JOIN tags t ON t.id = st.tag_id WHERE st.station_rowid = s.rowid) AS tags
  FROM stations s
  ORDER BY s.clickcount DESC, s.votes DESC, s.uuid
  LIMIT ? OFFSET ?
`).all(limit, offset);

if (rows.length === 0) {
  console.log(`gen-wave: nothing left at offset ${offset}`);
  process.exit(0);
}

// Compact station record — strip fields not needed in the research prompt
// (codec/bitrate/votes are diagnostic only and weren't moving the needle in
// research quality). Saves ~100 bytes per row, letting us fit ~3000 stations
// per script under the Workflow tool's 512 KB cap.
const trimmed = rows.map((r) => {
  // Cap tags: some long-tail stations have hundreds of comma-separated tags
  // that inflate the script past the 512 KB cap. 5 tags is plenty for context.
  const tags = (r.tags || '').split(',').slice(0, 5).join(',');
  const name = (r.name || '').slice(0, 80); // a few stations have very long names
  return {
    uuid: r.uuid, name, hp: r.homepage || '',
    cn: r.country || '', cc: r.countrycode || '',
    cl: r.clickcount || 0, sh: r.shard, tg: tags,
  };
});

const out = `export const meta = {
  name: 'station-research-wave${waveNum}',
  description: 'Research stations ${offset+1}-${offset+rows.length} by clickcount.',
  phases: [{ title: 'Research', detail: 'one agent per 5-station batch' }],
};

const STATIONS = ${JSON.stringify(trimmed)};

const BATCH_SIZE = ${batchSize};
log(\`Wave ${waveNum}: \${STATIONS.length} stations, batches of \${BATCH_SIZE}\`);

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

STEP 2 — DEEP RESEARCH
Combine these sources, in this order of preference:
  (a) WebFetch on the homepage URL with this prompt: "Identify the station's
      nature (commercial / non-commercial / public broadcaster / community /
      pirate / state media); parent organisation; religious / governmental /
      political / advocacy / activist affiliations; ownership history; audience;
      broadcast region and reach; programming format and notable shows; any
      mission, ethos, or position statements in the site's own words. Be
      concise and quote verbatim where possible." If the fetch fails or
      yields nothing useful, continue without it — DO NOT retry.
  (b) Your own internal knowledge of the station, its parent organisation,
      its country's broadcasting landscape, and the cultural / political
      context of the country. Trust your training.
  (c) Optional WebSearch (single query, sparingly) to fill a specific gap
      such as ownership, funding model, or a controversy.

Be especially thorough about:
  - commercial vs non-commercial / public / state-funded status
  - parent company, group ownership, funding model
  - government / public-broadcaster ties
  - religious affiliations (denomination, sect, faith tradition)
  - political affiliations (party, movement, ideology, advocacy)
  - audience demographic, language, region
  - programming format and notable shows / hosts
  - history (founding year, milestones)
  - controversies, sanctions, regulatory actions where notable

If the station is too obscure to research meaningfully, be honest: write
"Unknown" for fields you can't substantiate. Never fabricate or speculate.

STEP 3 — APPEND
Use Edit (or Read + Write) to append exactly this comment block to the END
of the YAML file. Every line must start with "# ". Keep each value to a
single sentence; expand "notes" for richer history.

  # === Public research ===
  # researched: 2026-06-09
  # nature: [commercial | non-commercial | public broadcaster | community | state media | unknown]
  # operator: [parent company / operator name, or Unknown]
  # affiliations: [orgs / govt / religion / political movement, or "none known"]
  # audience: [target audience / region / language]
  # format: [one-line programming summary]
  # notes: [history, scale, awards, controversies, mission quote, etc.]
  # sources: [comma-separated URLs you actually used, or "internal knowledge only"]

STEP 4 — LOG
After each station, run Bash:
  echo "[research] OK: <Station Name> (<CC>)"
or "SKIP (already annotated): <name>" or
"PARTIAL: <name> — <reason>".

CONSTRAINTS
- Process stations in the order listed.
- NEVER edit existing YAML fields; only append the new comment block.
- Don't introduce a blank line between existing content and the new comment.
- If you can't fetch a homepage, continue — don't retry.
- Keep each Edit/Write small.
- End your turn with: "Batch done: A annotated, B skipped, C partial."\`;
}

const results = await parallel(batches.map((batch, idx) => () =>
  agent(promptFor(batch, idx), {
    label: \`batch \${idx + 1}: \${batch[0].name.slice(0, 26).trim()}\`,
    phase: 'Research',
    ${model ? `model: ${JSON.stringify(model)},` : ''}
  })
));

const ok = results.filter(Boolean).length;
log(\`Wave ${waveNum} done — \${ok}/\${batches.length} batches\`);
return { wave: ${waveNum}, batches_total: batches.length, batches_ok: ok, station_count: STATIONS.length, offset: ${offset} };
`;

const outPath = resolve(`scripts/workflows/research-wave${waveNum}.js`);
writeFileSync(outPath, out);
console.log(`wrote ${outPath}`);
console.log(`  stations: ${rows.length}`);
console.log(`  clickcount range: ${rows[0].clickcount} .. ${rows[rows.length-1].clickcount}`);
console.log(`  script size: ${out.length} bytes`);
