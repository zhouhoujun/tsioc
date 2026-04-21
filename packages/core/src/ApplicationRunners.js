"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationRunners = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * Application runners.
 *
 * 应用程序运行集合
 */
let ApplicationRunners = class ApplicationRunners {
};
exports.ApplicationRunners = ApplicationRunners;
_a = ioc_1.noPointcut;
ApplicationRunners[_a] = true;
exports.ApplicationRunners = ApplicationRunners = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ApplicationRunners);
//# sourceMappingURL=ApplicationRunners.js.map