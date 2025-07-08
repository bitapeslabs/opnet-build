//import asc from 'assemblyscript/dist/asc.js';
import runtime from './runtime';
import WebTransformer from '@btc-vision/opnet-transform/build/OPNetWebTransform.js';
import { resolveDuplicatedPath } from './utils';
const buildContractWasm = (
    includeFiles: { [key: string]: string },
    asc: any,
): Promise<Uint8Array> => {
    return new Promise(async (resolve, reject) => {
        const asOptions = [
            /* build / output -------------------------------------------------------- */
            '--target',
            'release', // build the “release” target
            /* optimisation ---------------------------------------------------------- */
            '--optimizeLevel',
            '3', // O3
            '--shrinkLevel',
            '2', // S2  (was 0)
            '--converge', // extra optimisation pass
            '--noAssert', // strip runtime assertions
            /* runtime / memory ------------------------------------------------------ */
            '--runtime',
            'stub', // minimal runtime
            '--memoryBase',
            '0',
            '--initialMemory',
            '1', // 1 × 64 KiB page
            /* exports / bindings ---------------------------------------------------- */
            '--exportStart',
            'start', // call start()
            '--bindings',
            'esm', // generate ES-module bindings
            /* misc hooks ------------------------------------------------------------ */
            '--use',
            'abort=index/abort', // custom abort (updated path)
            /* WebAssembly feature flags --------------------------------------------- */
            '--enable',
            'sign-extension,mutable-globals,nontrapping-f2i,bulk-memory,simd,reference-types,multi-value',
        ];

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
            options: { bindings: 'esm' },
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
            transforms: [WebTransformer],
        });

        if (error || stderr) {
            reject({ error, stderr });
        }
    });
};

export { buildContractWasm };
