// rollup.config.js

import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export default {
    input: 'runtime/index.ts', // Entry point of your AssemblyScript code
    output: {
        file: 'build/bundle.ts', // Output file
        format: 'es', // ES module format
    },
    plugins: [
        resolve({
            extensions: ['.ts', '.js'],
        }),
        commonjs(),
        typescript({
            tsconfig: './tsconfig.json',
            check: false, // Disable type checking
            clean: true,
            abortOnError: false,
            transformers: [], // No custom transformers
            tsconfigOverride: {
                compilerOptions: {
                    noEmit: false,
                    skipLibCheck: true, // Skip library checking
                    noImplicitAny: false, // Allow implicit any types
                },
            },
        }),
    ],
};
