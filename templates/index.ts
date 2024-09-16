export const op20_build = (
    tokenName: string,
    tokenSymbol: string,
    tokenDecimals: number,
    tokenMaxSupply: string,
) =>
    `
@final
export class ${tokenName} extends OP_20 {
    constructor() {
        const maxSupply: u256 = u128.fromString('${tokenMaxSupply}').toU256();
        const decimals: u8 = ${tokenDecimals};
        const name: string = '${tokenName}';
        const symbol: string = '${tokenSymbol}';

        super(maxSupply, decimals, name, symbol);
    }

    public onInstantiated(): void {
        if (!this.isInstantiated) {
            super.onInstantiated();

        }
    }

    public override callMethod(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('airdrop'):
                return this.airdrop(calldata);
            default:
                return super.callMethod(method, calldata);
        }
    }

    private airdrop(calldata: Calldata): BytesWriter {
        const drops: Map<Address, u256> = calldata.readAddressValueTuple();

        const addresses: Address[] = drops.keys();
        for (let i: i32 = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const amount = drops.get(address);

            this._mint(address, amount);
        }

        const writer: BytesWriter = new BytesWriter();
        writer.writeBoolean(true);

        return writer;
    }
}
export function defineSelectors(): void {
  /** OP_NET */
  ABIRegistry.defineGetterSelector('address', false);
  ABIRegistry.defineGetterSelector('owner', false);
  ABIRegistry.defineMethodSelector('isAddressOwner', false);

  /** OP_20 */
  ABIRegistry.defineMethodSelector('allowance', false);
  ABIRegistry.defineMethodSelector('approve', true);
  ABIRegistry.defineMethodSelector('balanceOf', false);
  ABIRegistry.defineMethodSelector('burn', true);
  ABIRegistry.defineMethodSelector('mint', true);
  ABIRegistry.defineMethodSelector('transfer', true);
  ABIRegistry.defineMethodSelector('transferFrom', true);

  ABIRegistry.defineGetterSelector('decimals', false);
  ABIRegistry.defineGetterSelector('name', false);
  ABIRegistry.defineGetterSelector('symbol', false);
  ABIRegistry.defineGetterSelector('totalSupply', false);
  ABIRegistry.defineGetterSelector('maxSupply', false);

  /** Optional */
  ABIRegistry.defineMethodSelector('airdrop', true);

  // Define your selectors here.
}

// DO NOT TOUCH TO THIS.
Blockchain.contract = () => {
  // ONLY CHANGE THE CONTRACT CLASS NAME.
  const contract = new ${tokenName}();
  contract.onInstantiated();

  // DO NOT ADD CUSTOM LOGIC HERE.

  return contract;
}`;
