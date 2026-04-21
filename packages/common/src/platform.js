"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT = exports.PLATFORM_ID = exports.PLATFORM_SERVER_ID = exports.PLATFORM_BROWSER_ID = void 0;
exports.isPlatformBrowser = isPlatformBrowser;
exports.isPlatformServer = isPlatformServer;
const ioc_1 = require("@tsdi/ioc");
exports.PLATFORM_BROWSER_ID = 'browser';
exports.PLATFORM_SERVER_ID = 'server';
/**
 * platform id.
 */
exports.PLATFORM_ID = (0, ioc_1.token)('PLATFORM_ID');
/**
 * document.
 */
exports.DOCUMENT = (0, ioc_1.token)('DOCUMENT');
/**
 * Returns whether a platform id represents a browser platform.
 * @publicApi
 */
function isPlatformBrowser(platformId) {
    return platformId === exports.PLATFORM_BROWSER_ID;
}
/**
 * Returns whether a platform id represents a server platform.
 * @publicApi
 */
function isPlatformServer(platformId) {
    return platformId === exports.PLATFORM_SERVER_ID;
}
//# sourceMappingURL=platform.js.map