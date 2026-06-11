import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // We don't need a browser DOM yet — pure-logic units only.
    environment: 'node',
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: [
        'scripts/lib/canonical.ts',
        'scripts/lib/schema.ts',
        'src/spa/types.ts',
        'src/spa/views/search.ts',  // tested through parseInput exports
      ],
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: { '~': '/src' },
  },
});
