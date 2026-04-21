"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserXhr = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * A factory for `HttpXhrBackend` that uses the `XMLHttpRequest` browser API.
 */
let BrowserXhr = class BrowserXhr {
    build() {
        return new XMLHttpRequest();
    }
};
exports.BrowserXhr = BrowserXhr;
exports.BrowserXhr = BrowserXhr = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], BrowserXhr);
//# sourceMappingURL=xhr.js.map