declare const buildContractWasm: (includeFiles: {
    [key: string]: string;
}, asc: any) => Promise<Uint8Array>;
export * as templates from './templates';
export { buildContractWasm };
