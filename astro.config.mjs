import { readFile } from 'node:fs/promises';

import { defineConfig } from 'astro/config';
import { parse as parseYaml } from 'yaml';

const SITE_URL = process.env.SITE_URL ?? 'https://tune-out.app';

// Vite plugin: load *.yaml / *.yml as an ES module whose default export is
// the parsed value. Lets src/spa/i18n.ts dynamic-import locale bundles
// without shipping a YAML parser to the browser — Vite serialises the
// parsed object to JSON at build time and code-splits one chunk per locale.
function yamlPlugin() {
  return {
    name: 'tune-out-yaml',
    enforce: 'pre',
    async load(id) {
      const path = id.split('?')[0];
      if (!/\.ya?ml$/.test(path)) return null;
      const src = await readFile(path, 'utf8');
      return `export default ${JSON.stringify(parseYaml(src))};`;
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  //trailingSlash: 'always',
  output: 'static',
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'never',
    assets: '_assets',
  },
  vite: {
    assetsInclude: ['**/*.wasm'],
    plugins: [yamlPlugin()],
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
    },
    worker: {
      format: 'es',
    },
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
    server: {
      // The dev server only consumes pre-built artifacts under public/data/;
      // it should NEVER try to watch the ~57,000 station YAMLs under
      // data/stations/. Letting chokidar walk and tail those files makes the
      // dev server peg a CPU core (>400% load) for minutes after any batch
      // YAML rewrite (e.g. score-curation.py, apply-curation-deltas.py) and
      // can wedge it entirely on macOS where fsevents queues a fd per shard.
      watch: {
        ignored: [
          '**/data/stations/**',
          '**/.git/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/public/data/**',
        ],
      },
    },
  },
});
