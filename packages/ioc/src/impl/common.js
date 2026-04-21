"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullInjectorException = exports.CircularDependencyException = exports.THROW_FLAGE = exports.LAZY = void 0;
exports.createValueRecord = createValueRecord;
exports.createRecord = createRecord;
exports.resolveParameters = resolveParameters;
exports.resolveArgs = resolveArgs;
exports.tryResolveToken = tryResolveToken;
exports.resolveToken = resolveToken;
exports.mergePromise = mergePromise;
exports.eachProvider = eachProvider;
const tokens_1 = require("../tokens");
const type_1 = require("../metadata/type");
const lang_1 = require("../utils/lang");
const chk_1 = require("../utils/chk");
const obj_1 = require("../utils/obj");
const exception_1 = require("../exception");
const resolver_1 = require("../resolver");
const contexts_1 = require("../handlers/contexts");
function createValueRecord(value) {
    return { value };
}
function createRecord(factory, injectStati, tokenStati, multi) {
    const record = { factory, value: (tokenStati ?? injectStati) ? exports.LAZY : undefined, multi: multi ? [] : undefined };
    if ((0, chk_1.isBoolean)(tokenStati)) {
        record.stati = tokenStati;
    }
    return record;
}
function isRecord(target) {
    return (0, obj_1.isPlainObject)(target) && (target.factory || 'value' in target);
}
function resolveParameters(injector, params, context, resolver) {
    if (!params || !params.length)
        return [];
    if (!context) {
        context = (0, contexts_1.createRunContext)(injector);
    }
    if (!resolver) {
        resolver = (0, resolver_1.getResolver)(injector);
    }
    const len = params.length;
    const args = new Array(len);
    for (let i = 0; i < len; i++) {
        args[i] = resolver.resolve(params[i], context);
    }
    return args;
}
function resolveArgs(injector, deps, context, resolver) {
    if (!deps || !deps.length)
        return [];
    const ctx = context ?? (0, contexts_1.createRunContext)(injector);
    const resolverRef = resolver ?? (0, resolver_1.getResolver)(injector);
    const len = deps.length;
    const args = new Array(len);
    for (let i = 0; i < len; i++) {
        const arg = deps[i];
        if ((0, resolver_1.isParameter)(arg)) {
            args[i] = resolverRef.resolve(arg, ctx);
        }
        else {
            args[i] = resolveArg(injector, arg, ctx);
        }
    }
    return args;
}
function resolveArg(injector, arg, context) {
    if (isRecord(arg)) {
        if (arg.value !== undefined && arg.value !== exports.LAZY) {
            return arg.value;
        }
        const value = arg.factory?.(context) ?? null;
        if (arg.value === exports.LAZY)
            arg.value = value;
        return value;
    }
    else {
        let depFlags = tokens_1.InjectFlags.Default;
        let depToken;
        if ((0, chk_1.isArray)(arg)) {
            depToken = arg[0];
            const len = arg.length;
            for (let j = 1; j < len; j++) {
                const d = arg[j];
                if ((0, chk_1.isNumber)(d)) {
                    depFlags |= d;
                }
            }
        }
        else {
            depToken = arg;
        }
        if (context?.has(depToken))
            return context.get(depToken);
        return injector.get(depToken, undefined, depFlags);
    }
}
exports.LAZY = {};
exports.THROW_FLAGE = {};
// export const Empty: any[] = [];
// export const CIRCULAR = {};
// export const STATICABLE = Symbol('STATICABLE');
/**
 * 尝试解析令牌
 */
function tryResolveToken(token, rd, injector, notFoundValue, flags, context) {
    try {
        return resolveToken(token, rd, injector, notFoundValue, flags, context);
    }
    catch (e) {
        if (rd) {
            rd.value = exports.LAZY;
        }
        throw e;
    }
}
function resolveToken(token, rd, injector, notFoundValue, flags, context) {
    const multi = rd.multi;
    if (!multi && rd.value !== undefined && rd.value !== exports.LAZY) {
        return rd.value;
    }
    if (multi) {
        const parent = injector?.getParent();
        const hasParent = parent && !(flags & tokens_1.InjectFlags.Self);
        const values = hasParent ? parent.get(token, null, flags, context) : null;
        const factory = rd.factory;
        if (values || factory) {
            const result = [];
            if (values) {
                result.push(...values);
            }
            if (factory) {
                result.push(...factory(context, flags));
            }
            return result;
        }
        return multi;
    }
    const factory = rd.factory;
    if (factory) {
        const result = factory(context, flags);
        if (rd.value === exports.LAZY) {
            rd.value = result;
        }
        return result;
    }
    return notFoundValue;
}
const cirMsg = 'Circular dependency';
/**
 * circular dependency execption.
 */
class CircularDependencyException extends exception_1.Exception {
    constructor(message) {
        super(message ? cirMsg + message : cirMsg);
    }
}
exports.CircularDependencyException = CircularDependencyException;
/**
 * Null injector execption.
 */
class NullInjectorException extends exception_1.Exception {
    constructor(token) {
        super(`NullInjectorException: No provider for ${(0, chk_1.isFunction)(token) ? (0, type_1.getTypeName)(token) : token?.toString()}!`);
    }
}
exports.NullInjectorException = NullInjectorException;
function mergePromise(ps1, ps2) {
    if (ps1) {
        return ps1.then(ps2);
    }
    return ps2();
}
function eachProvider(providers, cb) {
    return (0, lang_1.deepForEach)(providers, cb, v => (0, obj_1.isPlainObject)(v) && !(v.provide || v.provider));
}
//# sourceMappingURL=common.js.map