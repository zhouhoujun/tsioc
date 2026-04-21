"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactiveEffect = exports.noReact = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
exports.noReact = Symbol('__noReact');
let ReactiveEffect = class ReactiveEffect {
    constructor() {
        this[_a] = true;
    }
};
exports.ReactiveEffect = ReactiveEffect;
_a = exports.noReact;
exports.ReactiveEffect = ReactiveEffect = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], ReactiveEffect);
//# sourceMappingURL=effect.js.map