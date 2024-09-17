import { buildWasm, templates } from '../src/index';
import fs from 'fs';

const build = async () => {
    console.log('[OPNET_BUNDLER] building...');
    const contents = await buildWasm(
        templates.op20_build({
            tokenName: 'ABrandNewShitCoin',
            tokenSymbol: 'SHIT',
            tokenDecimals: 1,
            tokenMaxSupply: '1000000',
        }),
    );
    const wasmFilePath = './build/build.wasm';

    console.log('[OPNET_BUNDLER] built and saved to: ' + wasmFilePath);

    fs.writeFileSync(wasmFilePath, contents);
};

build();
