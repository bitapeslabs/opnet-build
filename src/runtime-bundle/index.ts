//import asc from 'assemblyscript/dist/asc.js';
import runtime from './runtime';
import { resolveDuplicatedPath } from './utils';
const buildContractWasm = (
    includeFiles: {
        [key: string]: string;
    },
    asc: any,
): Promise<Uint8Array> => {
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
            '--use',
            'abort=index/abort',
            '--transform',
            'node_modules/@btc-vision/opnet-transform/build/OPNetTransformer.js',
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
            'asconfig.json': asConfig,
        };

        const readFile = async (filename: string, _) => {
            let potentialDuplicate = resolveDuplicatedPath(filename);
            return (
                //File is ppresent as is
                bundle[filename] ??
                //File is present if you remove weird duplicates added by compiler
                bundle[potentialDuplicate] ??
                //File is present in the original filename if you remove the "/" from node_modules
                bundle[filename.slice(1)] ??
                //File is present in the dupfix if you remove the "/ from node modules"
                bundle[potentialDuplicate.slice(1)] ??
                //File is not present lol (we tried)
                null
            );
        };

        const writeFile = async (filename: string, contents: Uint8Array | string) => {
            if (filename.endsWith('wasm')) {
                resolve(contents as Uint8Array);
            }
            return;
        };

        //Not even used by the compiler
        const listFiles = async (dirname, baseDir) => [];

        const { error, stderr, stdout, stats } = await asc.main(['index.ts', ...asOptions], {
            readFile,
            writeFile,
            listFiles,
        });

        if (error || stderr) {
            reject({ error, stderr });
        }
    });
};

export * as templates from './templates';
export { buildContractWasm };
