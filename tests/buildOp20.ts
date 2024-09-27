import { buildContractWasm, templates } from '../src/runtime-bundle/index';
import asc from 'assemblyscript/dist/asc.js';
import fs from 'fs';

const build = async () => {
    console.log('[OPNET_BUNDLER] building...');
    const contents = await buildContractWasm(
        templates.op20_build({
            tokenName: 'ABrandNewShitCoin',
            tokenSymbol: 'SHIT',
            tokenDecimals: 1,
            tokenMaxSupply: '1000000',
        }),
        asc,
    );
    const wasmFilePath = './build/build.wasm';

    console.log('[OPNET_BUNDLER] built and saved to: ' + wasmFilePath);

    fs.writeFileSync(wasmFilePath, contents);
};

build();
