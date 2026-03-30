import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.{mjs,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['skill/install/agentar_cli.mjs'],
      thresholds: {
        // Pure/testable functions are ~20% of the 2264-line file.
        // Async command handlers (cmdInstall, cmdSearch, cmdExport, etc.)
        // depend on HTTP, filesystem, and process control -- they need
        // integration tests (tests/test-*.sh), not unit tests.
        statements: 15,
        branches: 12,
        functions: 13,
        lines: 14,
      },
    },
  },
})
