import { tokenId, type_undef } from '@tsdi/ioc';

export const PLATFORM_BROWSER_ID = 'browser';
export const PLATFORM_SERVER_ID = 'server';

/**
 * platform id.
 */
export const PLATFORM_ID = tokenId<Object>('PLATFORM_ID');
/**
 * document.
 */
export const DOCUMENT = tokenId<Object>('DOCUMENT');

/**
 * Returns whether a platform id represents a browser platform.
 * @publicApi
 */
export function isPlatformBrowser(platformId: Object): boolean {
    return platformId === PLATFORM_BROWSER_ID
}

/**
 * Returns whether a platform id represents a server platform.
 * @publicApi
 */
export function isPlatformServer(platformId: Object): boolean {
    return platformId === PLATFORM_SERVER_ID
}

// CommonJS / Node have global context exposed as "global" variable.
// We don't want to include the whole node.d.ts this this compilation unit so we'll just fake
// the global "global" var for now.
declare const global: any;
declare const WorkerGlobalScope: any;

const __window = typeof window !== type_undef && window;
const __self = typeof self !== type_undef && typeof WorkerGlobalScope !== type_undef &&
    self instanceof WorkerGlobalScope && self;
const __global = typeof global !== type_undef && global;

// Check __global first, because in Node tests both __global and __window may be defined and _global
// should be __global in that case.
const _global: { [name: string]: any } = __global || __window || __self;
export { _global as global };