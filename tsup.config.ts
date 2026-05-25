import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'server/src/cli.ts',
    api: 'server/src/api.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  splitting: false,
  dts: false,
  minify: false,
  sourcemap: false,
  platform: 'node',
  target: 'node18',
  esbuildOptions(options) {
    options.define = {
      ...options.define,
      'process.env.NODE_ENV': '"production"',
    };
  },
});
