"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderFormater = exports.Logger = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * logger
 */
let Logger = class Logger {
};
exports.Logger = Logger;
exports.Logger = Logger = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], Logger);
/**
 * logger header formater.
 */
let HeaderFormater = class HeaderFormater {
};
exports.HeaderFormater = HeaderFormater;
exports.HeaderFormater = HeaderFormater = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HeaderFormater);
//# sourceMappingURL=logger.js.map