import { build } from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

await build({
    entryPoints: ['src/webworker-bundle/index.ts'],
    outfile: 'dist/webworker-bundle/opnetBuilder.js',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    plugins: [polyfillNode({ polyfills: { fs: true, path: true, module: true } })],
    tsconfig: './tsconfig.json',
});
