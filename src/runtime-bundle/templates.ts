export interface OP20BuildConfig {
    tokenName: string;
    tokenSymbol: string;
    tokenDecimals: number;
    tokenMaxSupply: string;
}

export type templateName = 'op20_build';

const op20_build = ({
    tokenName,
    tokenSymbol,
    tokenDecimals,
    tokenMaxSupply,
}: OP20BuildConfig) => ({
    [`contracts/${tokenName}.ts`]: `import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    AddressMap,
    Blockchain,
    BOOLEAN_BYTE_LENGTH,
    BytesWriter,
    Calldata,
    DeployableOP_20,
    OP20InitParameters,
} from '@btc-vision/btc-runtime/runtime';

@final
export class ${tokenName} extends DeployableOP_20 {
    public constructor() {
        super();

        // IMPORTANT. THIS WILL RUN EVERYTIME THE CONTRACT IS INTERACTED WITH. FOR SPECIFIC INITIALIZATION, USE "onDeployment" METHOD.
    }

    // "solidityLikeConstructor" This is a solidity-like constructor. This method will only run once when the contract is deployed.
    public override onDeployment(_calldata: Calldata): void {
        const maxSupply: u256 = u256.fromString('${tokenMaxSupply}'); // Your max supply.
        const decimals: u8 = ${tokenDecimals}; // Your decimals.
        const name: string = '${tokenName}'; // Your token name.
        const symbol: string = '${tokenSymbol}'; // Your token symbol.

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Add your logic here. Eg, minting the initial supply:
        this._mint(Blockchain.tx.origin, maxSupply);
    }

    @method(
        {
            name: 'address',
            type: ABIDataTypes.ADDRESS,
        },
        {
            name: 'amount',
            type: ABIDataTypes.UINT256,
        },
    )
    @returns({
        name: 'success',
        type: ABIDataTypes.BOOL,
    })
    @emit('Transfer')
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const response = new BytesWriter(BOOLEAN_BYTE_LENGTH);
        const resp = this._mint(calldata.readAddress(), calldata.readU256());

        response.writeBoolean(resp);

        return response;
    }

    @method({
        name: 'drops',
        type: ABIDataTypes.ADDRESS_UINT256_TUPLE,
    })
    @returns({
        name: 'success',
        type: ABIDataTypes.BOOL,
    })
    @emit('Transfer')
    public airdrop(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const drops: AddressMap<u256> = calldata.readAddressMapU256();

        const addresses: Address[] = drops.keys();
        for (let i: i32 = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const amount = drops.get(address);

            this._mint(address, amount, false);
        }

        const writer: BytesWriter = new BytesWriter(BOOLEAN_BYTE_LENGTH);
        writer.writeBoolean(true);

        return writer;
    }

    @method(
        {
            name: 'amount',
            type: ABIDataTypes.UINT256,
        },
        {
            name: 'addresses',
            type: ABIDataTypes.ARRAY_OF_ADDRESSES,
        },
    )
    @returns({
        name: 'success',
        type: ABIDataTypes.BOOL,
    })
    @emit('Transfer')
    public airdropWithAmount(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const amount: u256 = calldata.readU256();
        const addresses: Address[] = calldata.readAddressArray();

        for (let i: i32 = 0; i < addresses.length; i++) {
            this._optimizedMint(addresses[i], amount);
        }

        this._totalSupply.commit();

        const writer: BytesWriter = new BytesWriter(BOOLEAN_BYTE_LENGTH);
        writer.writeBoolean(true);

        return writer;
    }

    private _optimizedMint(address: Address, amount: u256): void {
        this.balanceOfMap.set(address, amount);
        this._totalSupply.addNoCommit(amount);

        this.createMintEvent(address, amount);
    }
}`,

    ['index.ts']: `import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { ${tokenName} } from './contracts/${tokenName}';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

// DO NOT TOUCH TO THIS.
Blockchain.contract = () => {
    // ONLY CHANGE THE CONTRACT CLASS NAME.
    // DO NOT ADD CUSTOM LOGIC HERE.

    return new ${tokenName}();
};

// VERY IMPORTANT
export * from '@btc-vision/btc-runtime/runtime/exports';

// VERY IMPORTANT
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}`,
});
export { op20_build };
