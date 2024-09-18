import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import path from 'path'; // Import Node's path module to create absolute paths
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.js',
            format: 'esm',
            inlineDynamicImports: true, // Inline dynamic imports into a single file
        },
    ],
    plugins: [
        resolve({
            preferBuiltins: true,
        }),
        commonjs(),
        commonjs(),
        alias({
            entries: {
                fs: path.resolve(__dirname, './empty/index.ts'), // Use an empty module for 'fs'
                path: path.resolve(__dirname, './empty/index.ts'), // Use an empty module for 'path'
            },
        }),
        typescript(),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            presets: ['@babel/preset-env'],
            plugins: [
                '@babel/plugin-syntax-top-level-await', // Enable top-level await support
            ],
        }),
    ],
};
