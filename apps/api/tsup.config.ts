import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // The shared workspace package is TypeScript source; bundle it into the
  // server output instead of leaving a runtime import to a .ts file.
  noExternal: [/@vidyagram\/shared/],
})
