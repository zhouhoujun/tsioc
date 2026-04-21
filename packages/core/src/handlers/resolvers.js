"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.missingPipeException = missingPipeException;
exports.getMutilResolveHanlder = getMutilResolveHanlder;
exports.createPayloadResolveInterceptors = createPayloadResolveInterceptors;
exports.isList = isList;
const ioc_1 = require("@tsdi/ioc");
function missingPipeException(parameter, type, method) {
    let message = `missing pipe to transform argument ${parameter.name ?? parameter.propertyKey ?? parameter.provider?.toString() ?? parameter.type?.toString()} type`;
    if (method) {
        message += `, method ${method.toString()}`;
    }
    if (type) {
        message += ` of class ${(0, ioc_1.getTypeName)(type)}`;
    }
    return new ioc_1.ArgumentException(message);
}
const MUTIL_RESOLVE_HANDLER = new ioc_1.ContextToken(() => null);
function getMutilResolveHanlder(runtime) {
    let scope = runtime.get(MUTIL_RESOLVE_HANDLER);
    if (!scope) {
        scope = (0, ioc_1.createResolveHandler)([
            (input, next, context) => {
                const [payload, pipe, parameter] = input;
                if (parameter.type === Array) {
                    if ((0, ioc_1.isArray)(payload)) {
                        return payload.map((val) => pipe.transform(val, ...parameter.args || []));
                    }
                }
                else if (parameter.type === Set) {
                    if ((0, ioc_1.isArray)(payload)) {
                        return new Set(payload.map((val) => pipe.transform(val, ...parameter.args || [])));
                    }
                    else if (payload instanceof Set) {
                        return new Set([...payload].map((val) => pipe.transform(val, ...parameter.args || [])));
                    }
                }
                else if (parameter.type === Map) {
                    if ((0, ioc_1.isArray)(payload)) {
                        return new Map(payload.map((val) => pipe.transform(val, ...parameter.args || [])));
                    }
                    else if (payload instanceof Map) {
                        return new Map([...payload].map((val) => pipe.transform(val, ...parameter.args || [])));
                    }
                    else if (payload) {
                        return new Map(Object.entries(payload).map(([key, val]) => [key, pipe.transform(val, ...parameter.args || [])]));
                    }
                }
                return next(input, context);
            }
        ]);
        runtime.set(MUTIL_RESOLVE_HANDLER, scope);
    }
    return scope;
}
function createPayloadResolveInterceptors(getPayload) {
    return [
        (parameter, next, context) => {
            const injector = context.getInjector();
            let pipe;
            if (parameter.pipe) {
                pipe = (0, ioc_1.isToken)(parameter.pipe) ? injector.get(parameter.pipe) : parameter.pipe;
            }
            else if (parameter.multi && (0, ioc_1.isFunction)(parameter.provider)) {
                pipe = injector.get((0, ioc_1.isPrimitive)(parameter.provider) ? parameter.provider.name.toLowerCase() : (0, ioc_1.getTypeName)(parameter.provider));
            }
            else if (parameter.type && (0, ioc_1.isPrimitive)(parameter.type)) {
                pipe = injector.get(parameter.type.name.toLowerCase());
            }
            else {
                return next(parameter, context);
            }
            if (!pipe)
                throw missingPipeException(parameter, parameter.target, parameter.propertyKey);
            let payload = getPayload(context.getPayload(), parameter.scope, parameter.field ?? parameter.name);
            if ((0, ioc_1.isNil)(payload)) {
                const data = getPayload(context.getPayload(), parameter.scope);
                if ((0, ioc_1.isDefined)(data) && !(0, ioc_1.isObject)(data)) {
                    payload = data;
                }
                else if (parameter.nullable) {
                    return parameter.defaultValue ?? null;
                }
                else {
                    return next(parameter, context);
                }
            }
            if (parameter.multi) {
                const value = getMutilResolveHanlder(context.getInjector().getRuntime()).handle([(0, ioc_1.isString)(payload) ? payload.split(',') : payload, pipe, parameter], context);
                if ((0, ioc_1.isResolved)(value))
                    return value;
            }
            else {
                return pipe.transform(payload, ...parameter.args || []);
            }
        }
    ];
}
/**
 * is list or not.
 * @param target
 * @returns
 */
function isList(target) {
    return (0, ioc_1.isArray)(target) || (0, ioc_1.isString)(target);
}
//# sourceMappingURL=resolvers.js.map