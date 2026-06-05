import {
    ArgumentException, AbstractType, isArray, isString, Parameter,
    ContextToken, RuntimeHandler, Runtime, isToken, isPrimitive, isFunction, getTypeName,
    createResolveHandler, isResolved, isNil, isObject, isDefined, getClassRef,
    ResolveInterceptorFn
} from '@tsdi/ioc';
import { MessageValueReader, TransportParameter } from './resolver';
import { PipeTransform } from '../pipes/pipe';

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

export function createPayloadResolveInterceptors(reader?: MessageValueReader): ResolveInterceptorFn<TransportParameter>[] {
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

            if (!pipe && !hasMessageScope) throw missingPipeException(parameter, parameter.target, parameter.propertyKey);


            const field = parameter.field ?? parameter.name;
            const payloadReader = reader ?? injector.get(MessageValueReader, null);
            let payload: any;
            if (payloadReader && parameter.scope) {
                payload = payloadReader.read(parameter.scope, field as any, context);
            } else {
                const input = context.getPayload() as Record<string, any> | undefined;
                if (parameter.scope && input) {
                    const scopeVal = input[parameter.scope];
                    payload = field && scopeVal ? scopeVal[field] : scopeVal;
                }
            }

            if (isNil(payload)) {
                if (payloadReader && parameter.scope) {
                    const data = payloadReader.read(parameter.scope, undefined, context);
                    if (isDefined(data)) {
                        payload = data;
                    } else if (parameter.nullable) {
                        return parameter.defaultValue ?? null;
                    } else {
                        return next(parameter, context);
                    }
                } else if (parameter.nullable) {
                    return parameter.defaultValue ?? null;
                } else {
                    return next(parameter, context);
                }
            }

            if (!pipe) {
                return payload;
            }
            if (parameter.multi) {
                const value = getMutilResolveHanlder(context.getInjector().getRuntime()).handle([isString(payload) ? payload.split(',') : payload, pipe, parameter], context);
                if (isResolved(value)) return value;
            } else {
                return pipe.transform(payload, ...parameter.args || []);
            }
        }
    ];
}

/**
 * Create message resolve interceptors.
 */
export function createMessageResolveInterceptors(reader?: MessageValueReader): ResolveInterceptorFn<TransportParameter>[] {
    return createPayloadResolveInterceptors(reader);
}

/**
 * is list or not.
 * @param target
 * @returns
 */
export function isList(target: any) {
    return isArray(target) || isString(target);
}
