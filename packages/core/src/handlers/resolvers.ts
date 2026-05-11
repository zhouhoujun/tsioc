import {
    ArgumentException, AbstractType, isArray, isString, Parameter, ResolveInterceptorLike,
    ContextToken, RuntimeHandler, Runtime, isToken, isPrimitive, isFunction, getTypeName,
    createResolveHandler, isResolved, isNil, isObject, isDefined,
    ResolveInterceptorFn, Type
} from '@tsdi/ioc';
import { ParameterScope, TransportParameter } from './resolver';
import { PipeTransform } from '../pipes/pipe';
import { MessageReaderFactory } from '../MessageReader';


export function missingPipeException<T>(parameter: Parameter<T>, type?: AbstractType, method?: string | symbol) {
    let message = `missing pipe to transform argument ${parameter.name ?? parameter.propertyKey ?? parameter.provider?.toString() ?? parameter.type?.toString()} type`;
    if (method) {
        message += `, method ${method.toString()}`
    }
    if (type) {
        message += ` of class ${getTypeName(type)}`
    }
    return new ArgumentException(message)
}


const MUTIL_RESOLVE_HANDLER = new ContextToken<RuntimeHandler>(() => null!);
export function getMutilResolveHanlder(runtime: Runtime): RuntimeHandler<[any, PipeTransform, TransportParameter]> {
    let scope = runtime.get(MUTIL_RESOLVE_HANDLER);
    if (!scope) {
        scope = createResolveHandler(
            [
                (input, next, context): any => {
                    const [payload, pipe, parameter] = input;
                    if (parameter.type === Array) {
                        if (isArray(payload)) {
                            return payload.map((val: any) => pipe.transform(val, ...parameter.args || []))
                        }
                    } else if (parameter.type === Set) {
                        if (isArray(payload)) {
                            return new Set(payload.map((val: any) => pipe.transform(val, ...parameter.args || [])))
                        } else if (payload instanceof Set) {
                            return new Set([...payload].map((val: any) => pipe.transform(val, ...parameter.args || [])))
                        }
                    } else if (parameter.type === Map) {
                        if (isArray(payload)) {
                            return new Map(payload.map((val: any) => pipe.transform(val, ...parameter.args || [])))
                        } else if (payload instanceof Map) {
                            return new Map([...payload].map((val: any) => pipe.transform(val, ...parameter.args || [])))
                        } else if (payload) {
                            return new Map(Object.entries(payload).map(([key, val]) => [key, pipe.transform(val, ...parameter.args || [])]))
                        }
                    }

                    return next(input, context);
                }

            ]
        );
        runtime.set(MUTIL_RESOLVE_HANDLER, scope);
    }
    return scope;
}


/**
 * Create message resolve interceptors.
 *
 * At request time, resolves a {@link MessageReaderFactory} (from the provided type,
 * instance, or the IoC container), calls `factory.create(message)` to create a
 * protocol-specific reader, and uses {@link AbstractMessageReader.field} to extract
 * parameter values.
 *
 * @param factory - A factory class (resolved from the IoC container), a factory
 *   instance (used directly), or undefined (defaults to resolving
 *   {@link MessageReaderFactory} from the container).
 */
export function createMessageResolveInterceptors(
    factory?: Type<MessageReaderFactory> | MessageReaderFactory
): ResolveInterceptorFn<TransportParameter>[] {
    const factoryInstance = isFunction(factory)
        ? undefined  // Type — resolve from container at request time
        : factory;    // instance — use directly

    const token = isFunction(factory) ? factory : MessageReaderFactory;

    return [
        (parameter, next, context) => {
            const injector = context.getInjector();
            const hasMessageScope = !!parameter.scope;
            let pipe: PipeTransform | undefined;
            if (parameter.pipe) {
                pipe = isToken(parameter.pipe) ? injector.get<PipeTransform>(parameter.pipe) : parameter.pipe;
            } else if (parameter.multi && isFunction(parameter.provider)) {
                pipe = injector.get<PipeTransform>(isPrimitive(parameter.provider) ? parameter.provider.name.toLowerCase() : getTypeName(parameter.provider));
            } else if (parameter.type && isPrimitive(parameter.type)) {
                pipe = injector.get<PipeTransform>(parameter.type.name.toLowerCase());
            } else if (!hasMessageScope) {
                return next(parameter, context);
            }

            if (!pipe && !hasMessageScope) {
                return next(parameter, context);
            }
            if (!pipe && hasMessageScope) {
            } else if (!pipe) {
                throw missingPipeException(parameter, parameter.target, parameter.propertyKey);
            }

            const resolvedFactory = factoryInstance ?? injector.get(token, null);
            const reader = resolvedFactory?.create(context.getPayload());
            const implicitWholeSection = parameter.scope === 'body' || parameter.scope === 'payload';
            const field = isDefined(parameter.field) ? parameter.field : (implicitWholeSection ? undefined : parameter.name);

            let payload: any;
            if (reader) {
                payload = reader.field(parameter.scope as any, field as any);
            } else {
                const input = context.getPayload();
                if (parameter.scope && input) {
                    const scopeVal = input[parameter.scope];
                    payload = field && scopeVal ? scopeVal[field] : scopeVal;
                }
            }

            if (isNil(payload)) {
                if (reader) {
                    const data = reader.field(parameter.scope as any);
                    if (isDefined(data) && (!isObject(data) || implicitWholeSection)) {
                        payload = data;
                    } else if (parameter.nullable) {
                        return parameter.defaultValue ?? null;
                    } else {
                        return next(parameter, context);
                    }
                } else {
                    if (parameter.nullable) {
                        return parameter.defaultValue ?? null;
                    } else {
                        return next(parameter, context);
                    }
                }
            }

            if (!pipe) {
                return payload;
            }
            if (parameter.multi) {
                const value = getMutilResolveHanlder(context.getInjector().getRuntime()).handle([isString(payload) ? payload.split(',') : payload, pipe, parameter], context);
                if (isResolved(value)) return value;
            } else {
                return pipe.transform(payload, ...parameter.args || [])
            }
        }
    ];
}

/**
 * @deprecated Use {@link createMessageResolveInterceptors} instead.
 */
export function createPayloadResolveInterceptors(_getPayload?: (input: any, scope?: ParameterScope, filed?: string) => any): ResolveInterceptorFn<TransportParameter>[] {
    return createMessageResolveInterceptors();
}




/**
 * is list or not.
 * @param target 
 * @returns 
 */
export function isList(target: any) {
    return isArray(target) || isString(target);
}
