export interface OP20BuildConfig {
    tokenName: string;
    tokenSymbol: string;
    tokenDecimals: number;
    tokenMaxSupply: string;
}
export type templateName = 'op20_build';
declare const op20_build: ({ tokenName, tokenSymbol, tokenDecimals, tokenMaxSupply, }: OP20BuildConfig) => {
    [x: string]: string;
    'index.ts': string;
};
export { op20_build };
