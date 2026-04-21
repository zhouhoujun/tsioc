"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNRESOLVED = exports.MissingParameterException = exports.DefaultResolver = void 0;
exports.object2string = object2string;
exports.isResolved = isResolved;
exports.createResolveHandler = createResolveHandler;
exports.getParameterResolveHanlder = getParameterResolveHanlder;
const exception_1 = require("../exception");
const context_1 = require("../context");
const handler_1 = require("../lifescope/handler");
const type_1 = require("../metadata/type");
const type_def_1 = require("../metadata/type.def");
const class_1 = require("../metadata/class");
const tokens_1 = require("../tokens");
const chk_1 = require("../utils/chk");
const obj_1 = require("../utils/obj");
const common_1 = require("./common");
const injector_1 = require("./injector");
const compose_1 = require("../handlers/compose");
class DefaultResolver {
    constructor(handler) {
        this.handler = handler;
    }
    resolve(parameter, context) {
        const metaRvr = parameter.resolver;
        let handler = this.handler;
        if (metaRvr?.length) {
            handler = createResolveHandler(metaRvr.map(r => (0, type_1.isType)(r) ? context.getInjector().get(r) : r), this.handler);
        }
        return (0, compose_1.invokeTail)(() => handler.handle(parameter, context), {
            next: (res) => {
                if (res === exports.UNRESOLVED) {
                    const failed = context.getFailed();
                    if (failed) {
                        failed(parameter.target, parameter.propertyKey);
                    }
                    else {
                        this.missingException([parameter], parameter.target, parameter.propertyKey);
                    }
                    return null;
                }
                return res;
            },
            error: (error) => {
                if (error instanceof exception_1.Exception) {
                    throw error;
                }
                const failed = context.getFailed();
                if (failed) {
                    failed(parameter.target, parameter.propertyKey);
                }
                else {
                    this.missingException([parameter], parameter.target, parameter.propertyKey);
                }
            }
        });
    }
    // resolveArgs(injector: Injector, args?: (ParameterLike | InjectorRecord)[], context?: RunContext): any[] {
    //     return resolveArgs(injector, args, context, this)
    // }
    resolveParams(injector, params, context) {
        return (0, common_1.resolveParameters)(injector, params, context, this);
    }
    missingException(missings, type, method) {
        throw new MissingParameterException(missings, type, method);
    }
}
exports.DefaultResolver = DefaultResolver;
/**
 * Missing argument execption.
 */
class MissingParameterException extends exception_1.Exception {
    constructor(parameters, type, method) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`);
    }
}
exports.MissingParameterException = MissingParameterException;
const deft = {
    typeInst: true,
    fun: true
};
/**
 * format object to string for log.
 * @param obj
 * @returns
 */
function object2string(obj, options) {
    options = { ...deft, ...options };
    if ((0, chk_1.isArray)(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`;
    }
    else if ((0, chk_1.isString)(obj)) {
        return `"${obj}"`;
    }
    else if ((0, type_1.isType)(obj)) {
        return 'Type<' + (0, type_1.getTypeName)(obj) + '>';
    }
    else if (obj instanceof class_1.ClassRef) {
        return `[${obj.className} TypeReflect]`;
    }
    else if ((0, obj_1.isPlainObject)(obj)) {
        const str = [];
        for (const n in obj) {
            const value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`);
        }
        return `{ ${str.join(', ')} }`;
    }
    else if (options.typeInst && (0, obj_1.isTypeObject)(obj)) {
        const fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${(0, type_1.getTypeName)(obj)} {${fileds.join(', ')}} ]`;
    }
    if (!options.fun && (0, chk_1.isFunction)(obj)) {
        return 'Function';
    }
    return `${obj?.toString()}`;
}
exports.UNRESOLVED = {};
const unResolve = (input, context) => exports.UNRESOLVED;
function isResolved(value) {
    return value !== exports.UNRESOLVED;
}
// export function createResolveHandler(interceptors?: ResolveInterceptorLike[], backend?: ResolveHandlerLike | null): ResolveHandler {
//     return new RuntimeHandler(backend ?? unResolve, interceptors) 
// }
function createResolveHandler(interceptors, backend) {
    return new handler_1.RuntimeHandler(backend ?? unResolve, interceptors);
}
function tryResolve(injector, token, flags, context) {
    if (context?.has(token))
        return context.get(token, flags);
    if (injector.has(token, flags)) {
        return injector.get(token, exports.UNRESOLVED, flags, context);
    }
    if (!(0, type_1.isType)(token) || (0, type_def_1.getDef)(token).abstract) {
        return exports.UNRESOLVED;
    }
    if (!injector.has(token)) {
        injector_1.InjectUtil.register(injector, token);
    }
    return injector.get(token, exports.UNRESOLVED, flags, context);
}
const PARAMETER_RESOLVE_HANDLER = new context_1.ContextToken(() => null);
function getParameterResolveHanlder(runtime) {
    let scope = runtime.get(PARAMETER_RESOLVE_HANDLER);
    if (!scope) {
        scope = new handler_1.RuntimeHandler((input, context) => {
            const injector = context.getInjector();
            if (input.provider && !input.multi) {
                const value = tryResolve(injector, input.provider, input.flags, context);
                if (isResolved(value))
                    return value;
            }
            else if (!input.multi && input.name && injector.has(input.name, input.flags)) {
                const value = injector.get(input.name, exports.UNRESOLVED, input.flags);
                if (isResolved(value))
                    return value;
            }
            else if (input.type) {
                const value = tryResolve(injector, input.type, input.flags, context);
                if (isResolved(value))
                    return value;
            }
            if (!(0, chk_1.isNil)(input.defaultValue)) {
                return input.defaultValue;
            }
            if (input.nullable === true || (input.flags && !!(input.flags & tokens_1.InjectFlags.Optional))) {
                return null;
            }
            return exports.UNRESOLVED;
        });
        runtime.set(PARAMETER_RESOLVE_HANDLER, scope);
    }
    return scope;
}
//# sourceMappingURL=resolver.js.map