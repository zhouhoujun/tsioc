"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asProvider = asProvider;
exports.isModuleProviders = isModuleProviders;
exports.isValueProvider = isValueProvider;
exports.isTypeProvider = isTypeProvider;
exports.isClassProvider = isClassProvider;
exports.isExistingProvider = isExistingProvider;
exports.isFactoryProvider = isFactoryProvider;
exports.toProvider = toProvider;
exports.toMutilProvdierOf = toMutilProvdierOf;
exports.toProviders = toProviders;
const obj_1 = require("./utils/obj");
const chk_1 = require("./utils/chk");
const exception_1 = require("./exception");
const type_1 = require("./metadata/type");
function asProvider(provider) {
    return provider;
}
/**
 * is module providers or not.
 * @param target
 * @returns
 */
function isModuleProviders(target) {
    return target && (0, chk_1.isFunction)(target.module) && (0, chk_1.isArray)(target.providers);
}
function isValueProvider(target) {
    return (0, obj_1.isPlainObject)(target) && ('useValue' in target);
}
function isTypeProvider(target) {
    return (0, type_1.isType)(target);
}
function isClassProvider(target) {
    return target && (0, chk_1.isFunction)(target.useClass);
}
function isExistingProvider(target) {
    return (0, obj_1.isPlainObject)(target) && ('useExisting' in target);
}
function isFactoryProvider(target) {
    return target && (0, chk_1.isFunction)(target.useFactory);
}
function toProvider(provide, useOf, multi) {
    const options = ((0, chk_1.isBoolean)(multi) ? { multi } : (multi ?? {}));
    if ((0, type_1.isType)(useOf)) {
        if (provide == useOf)
            throw new exception_1.ArgumentException((0, type_1.getTypeName)(provide) + ': provide is equals to provider');
        return { ...options, provide, useClass: useOf };
    }
    else if ((0, obj_1.isPlainObject)(useOf) && ((0, chk_1.isDefined)(useOf.useClass)
        || (0, chk_1.isDefined)(useOf.useValue)
        || (0, chk_1.isDefined)(useOf.useFactory)
        || (0, chk_1.isDefined)(useOf.useExisting))) {
        return { ...options, ...useOf, provide };
    }
    return { ...options, provide, useValue: useOf };
    // throw new ArgumentException('the argument is not ProviderOf type');
}
function toMutilProvdierOf(useOf, multiOrder) {
    if ((0, chk_1.isNil)(multiOrder))
        return useOf;
    if ((0, type_1.isType)(useOf)) {
        return { useClass: useOf, multi: true, multiOrder };
    }
    else if ((0, obj_1.isPlainObject)(useOf) && ((0, chk_1.isDefined)(useOf.useClass)
        || (0, chk_1.isDefined)(useOf.useValue)
        || (0, chk_1.isDefined)(useOf.useFactory)
        || (0, chk_1.isDefined)(useOf.useExisting))) {
        return { ...useOf, multi: true, multiOrder };
    }
    return { useValue: useOf, multi: true, multiOrder };
    // throw new ArgumentException('the argument is not ProviderOf type');
}
function toProviders(provide, useOf, multi) {
    return useOf.map(r => toProvider(provide, r, multi));
}
//# sourceMappingURL=providers.js.map