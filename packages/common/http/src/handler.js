"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XhrFactory = exports.HttpBackend = exports.HttpHandler = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * http handler.
 */
let HttpHandler = class HttpHandler {
};
exports.HttpHandler = HttpHandler;
exports.HttpHandler = HttpHandler = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HttpHandler);
/**
 * http backend.
 */
let HttpBackend = class HttpBackend {
};
exports.HttpBackend = HttpBackend;
exports.HttpBackend = HttpBackend = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HttpBackend);
/**
 * xhr factory.
 */
let XhrFactory = class XhrFactory {
};
exports.XhrFactory = XhrFactory;
exports.XhrFactory = XhrFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], XhrFactory);
//# sourceMappingURL=handler.js.map