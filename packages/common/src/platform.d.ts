export declare const PLATFORM_BROWSER_ID = "browser";
export declare const PLATFORM_SERVER_ID = "server";
/**
 * platform id.
 */
export declare const PLATFORM_ID: import("@tsdi/ioc").InjectToken<Object>;
/**
 * document.
 */
export declare const DOCUMENT: import("@tsdi/ioc").InjectToken<Object>;
/**
 * Returns whether a platform id represents a browser platform.
 * @publicApi
 */
export declare function isPlatformBrowser(platformId: Object): boolean;
/**
 * Returns whether a platform id represents a server platform.
 * @publicApi
 */
export declare function isPlatformServer(platformId: Object): boolean;
