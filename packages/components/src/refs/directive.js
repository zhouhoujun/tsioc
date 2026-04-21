"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectiveFactory = exports.DirectiveRef = exports.DirectiveType = exports.factoryKey = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
exports.factoryKey = 'ƿfac';
/**
 * 指令类型枚举
 */
var DirectiveType;
(function (DirectiveType) {
    /** 普通指令 */
    DirectiveType[DirectiveType["Normal"] = 0] = "Normal";
    /** 条件指令 */
    DirectiveType[DirectiveType["Conditional"] = 2] = "Conditional";
    /** 列表指令 */
    DirectiveType[DirectiveType["Iterable"] = 4] = "Iterable";
    DirectiveType[DirectiveType["Component"] = 8] = "Component";
})(DirectiveType || (exports.DirectiveType = DirectiveType = {}));
/**
 * DirectiveRef.
 */
let DirectiveRef = class DirectiveRef extends ioc_1.AbstractInvocation {
    constructor() {
        super(...arguments);
        this[_a] = true;
    }
};
exports.DirectiveRef = DirectiveRef;
_a = effect_1.noReact;
exports.DirectiveRef = DirectiveRef = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], DirectiveRef);
/**
 * ComponentRef factory.
 */
let DirectiveFactory = class DirectiveFactory {
};
exports.DirectiveFactory = DirectiveFactory;
exports.DirectiveFactory = DirectiveFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], DirectiveFactory);
//# sourceMappingURL=directive.js.map