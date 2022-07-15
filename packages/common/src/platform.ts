import { tokenId } from '@tsdi/ioc';

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
