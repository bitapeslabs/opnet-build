import { build } from 'esbuild';
import { emptyModulesPlugin } from './scripts/esbuild-plugins/emptyModulesPlugin.js';

await build({
    entryPoints: ['src/runtime-bundle/index.ts'],
    outfile: 'dist/runtime-bundle/index.js',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    plugins: [],
    tsconfig: './tsconfig.json',
});
