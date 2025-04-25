import { build } from 'esbuild';
import { emptyModulesPlugin } from './scripts/esbuild-plugins/emptyModulesPlugin.js';

await build({
    entryPoints: ['src/webworker-bundle/index.ts'],
    outfile: 'dist/webworker-bundle/opnetBuilder.js',
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2022'],
    plugins: [emptyModulesPlugin(['module', 'fs', 'path'])],
    tsconfig: './tsconfig.json',
});
