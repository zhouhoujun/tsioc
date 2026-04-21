"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleRef = void 0;
exports.getModuleType = getModuleType;
const tslib_1 = require("tslib");
const injector_1 = require("./injector");
const fac_1 = require("./metadata/fac");
const type_1 = require("./metadata/type");
const lang_1 = require("./utils/lang");
const obj_1 = require("./utils/obj");
/**
 * Represents an instance of an `Module` created by an `ModuleFactory`.
 * Provides access to the `Module` instance and related objects. Default static Injector.
 *
 * 模块类容器, 默认静态容器
 *
 * @publicApi
 */
let ModuleRef = class ModuleRef extends injector_1.Injector {
};
exports.ModuleRef = ModuleRef;
exports.ModuleRef = ModuleRef = tslib_1.__decorate([
    (0, fac_1.Abstract)()
], ModuleRef);
function getModuleType(input) {
    const types = [];
    (0, lang_1.deepForEach)(input, ty => {
        if ((0, type_1.isType)(ty) || ty.module) {
            types.push(ty);
        }
    }, v => (0, obj_1.isPlainObject)(v) && !v.module);
    return types;
}
//# sourceMappingURL=module.ref.js.map