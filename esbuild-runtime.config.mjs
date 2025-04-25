import { build } from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

await build({
    entryPoints: ['src/runtime-bundle/index.ts'],
    outfile: 'dist/runtime-bundle/index.js',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    plugins: [polyfillNode({ polyfills: { fs: true, path: true, module: true } })],
    tsconfig: './tsconfig.json',
});
