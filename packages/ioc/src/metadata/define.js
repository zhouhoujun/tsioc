"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.Decors = exports.ctorName = void 0;
exports.toDefine = toDefine;
/**
 * create decorator define.
 * @param name
 * @param decor
 * @param metadata
 * @param decorType
 * @param options
 * @param propertyKey
 * @param parameterIndex
 * @returns decorator define
 */
function toDefine(decor, metadata, decorType, options, propertyKey, parameterIndex) {
    return {
        decor,
        propertyKey: propertyKey,
        parameterIndex,
        decorType,
        metadata,
        actionType: options.actionType
    };
}
exports.ctorName = 'constructor';
var Decors;
(function (Decors) {
    Decors.CLASS = 'class';
    Decors.property = 'property';
    Decors.method = 'method';
    Decors.parameter = 'parameter';
    Decors.beforeAnnoation = 'beforeAnnoation';
    Decors.afterAnnoation = 'afterAnnoation';
})(Decors || (exports.Decors = Decors = {}));
var ActionType;
(function (ActionType) {
    ActionType[ActionType["inject"] = 1] = "inject";
    ActionType[ActionType["annoation"] = 2] = "annoation";
    ActionType[ActionType["declaration"] = 4] = "declaration";
    ActionType[ActionType["runnable"] = 8] = "runnable";
    ActionType[ActionType["providers"] = 16] = "providers";
    ActionType[ActionType["module"] = 32] = "module";
    ActionType[ActionType["component"] = 64] = "component";
    ActionType[ActionType["directive"] = 128] = "directive";
})(ActionType || (exports.ActionType = ActionType = {}));
//# sourceMappingURL=define.js.map