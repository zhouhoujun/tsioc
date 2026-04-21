"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentFactory = exports.ComponentRef = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
/**
 * ComponentRef.
 */
let ComponentRef = class ComponentRef extends ioc_1.AbstractInvocation {
    constructor() {
        super(...arguments);
        this[_a] = true;
    }
};
exports.ComponentRef = ComponentRef;
_a = effect_1.noReact;
exports.ComponentRef = ComponentRef = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ComponentRef);
/**
 * ComponentRef factory.
 */
let ComponentFactory = class ComponentFactory {
};
exports.ComponentFactory = ComponentFactory;
exports.ComponentFactory = ComponentFactory = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ComponentFactory);
//# sourceMappingURL=component.js.map