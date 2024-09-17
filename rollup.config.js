import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.js',
            format: 'esm',
        },
    ],
    plugins: [
        resolve(),
        commonjs(),
        typescript({
            tsconfigOverride: {
                compilerOptions: {
                    declaration: true, // Generate declaration files
                    declarationDir: 'dist/types', // Output type declarations in this directory
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
