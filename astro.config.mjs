import { defineConfig } from 'astro/config';

const SITE_URL = process.env.SITE_URL ?? 'https://tune-out.app';

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
