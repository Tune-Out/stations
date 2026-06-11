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
  },
});
