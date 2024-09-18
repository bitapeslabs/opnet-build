//import asc from 'assemblyscript/dist/asc.js';

import asc from 'assemblyscript/dist/asc.js';

import runtime from './runtime';

const buildContractWasm = (includeFiles: {
    [key: string]: string;
}): Promise<string | Uint8Array> => {
    return new Promise(async (resolve, reject) => {
        const asOptions = [
            '--target',
            'release', // Target release mode
            '--measure', // Measure compilation
            '-Ospeed', // Optimize for speed
            '--noAssert', // Disable runtime assertions
            '--optimizeLevel',
            '3', // Set optimize level to 3
            '--shrinkLevel',
            '2', // Set shrink level to 2
            '--converge', // Optimize code for convergence
            '--disable',
            'mutable-globals,sign-extension,nontrapping-f2i,bulk-memory', // Disable specific WebAssembly features
            '--runtime',
            'stub', // Use the 'stub' runtime
            '--memoryBase',
            '0', // Set memory base to 0
            '--lowMemoryLimit', // Enable low memory limit mode
            '--uncheckedBehavior',
            'never', // Never allow unchecked behavior
            '--initialMemory',
            '1', // Set initial memory to 1 page (64KB)
            '--maximumMemory',
            '512',
        ]; // Set maximum memory to 512 pages (32MB)

        const asConfig = JSON.stringify({
            targets: {
                release: {
                    outFile: 'build.wasm',
                    sourceMap: false,
                    optimizeLevel: 3,
                    shrinkLevel: 2,
                    converge: true,
                    noAssert: true,
                },
            },
            options: {
                bindings: 'esm',
            },
        });

        const bundle = {
            ...Object.entries(runtime).reduce((acc, file) => {
                const [path, src] = file;
                acc[path] = atob(src);
                return acc;
            }, {}),
            ...includeFiles,
            './asconfig.json': asConfig,
        };

        const readFile = async (fileName, baseDir) => {
            baseDir = baseDir.split('\\').join('/');
            fileName = fileName.split('\\').join('/');

            const source = bundle[baseDir + '/' + fileName];

            return source;
        };

        const writeFile = async (filename: string, contents: Uint8Array | string) => {
            if (filename.endsWith('wasm')) {
                resolve(contents);
            }
            return;
        };

        const { error, stderr, stdout, stats } = await asc.main(['index.ts', ...asOptions], {
            readFile,
            writeFile,
        });

        if (error) {
            console.log(error.stack);

            for (const warning of stderr as any) {
                try {
                    console.log(warning.toString());
                } catch (e) {}
            }

            reject(error.toString());
        }
    });
};

export * as templates from './templates';
export { buildContractWasm };
