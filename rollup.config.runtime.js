import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import emptyModulesPlugin from './scripts/rollup-plugins/emptyModulesPlugin.js';

export default {
    input: 'src/runtime-bundle/index.ts',
    output: [
        {
            file: 'dist/runtime-bundle/index.js',
            format: 'esm',
            inlineDynamicImports: true, // Inline dynamic imports into a single file
        },
    ],
    plugins: [
        emptyModulesPlugin(['module', 'fs', 'path']),

        resolve({
            preferBuiltins: false,
            browser: true,
        }),
        commonjs(),
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    declaration: true, // Generate declaration files
                    declarationDir: 'dist/runtime-bundle/types', // Output type declarations in this directory
                },
            },
            useTsconfigDeclarationDir: true,
        }),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            presets: ['@babel/preset-env'],
        }),
    ],
};
