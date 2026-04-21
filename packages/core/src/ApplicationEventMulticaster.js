"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationEventMulticaster = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * providing the basic listener registration facility.
 *
 * 提供基本的事件侦听器注册工具。
 */
let ApplicationEventMulticaster = class ApplicationEventMulticaster {
};
exports.ApplicationEventMulticaster = ApplicationEventMulticaster;
_a = ioc_1.noPointcut;
ApplicationEventMulticaster[_a] = true;
exports.ApplicationEventMulticaster = ApplicationEventMulticaster = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ApplicationEventMulticaster);
//# sourceMappingURL=ApplicationEventMulticaster.js.map