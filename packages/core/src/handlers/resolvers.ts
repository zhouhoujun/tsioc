import {
    ArgumentException, AbstractType, isArray, isString, Parameter,
    ContextToken, RuntimeHandler, Runtime, isToken, isPrimitive, isFunction, getTypeName,
    createResolveHandler, isResolved, isNil, isObject, isDefined, getClassRef,
    ResolveInterceptorFn,
    InjectFlags
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
                pipe = injector.get<PipeTransform>(isPrimitive(parameter.provider) ? parameter.provider.name.toLowerCase() : getTypeName(parameter.provider), null!);
            } else if (parameter.type && isPrimitive(parameter.type)) {
                pipe = injector.get<PipeTransform>(parameter.type.name.toLowerCase(), null!);
            } else if (!hasMessageScope) {
                return next(parameter, context);
            }

            const msgReader = reader ?? injector.get(MessageValueReader, null);

            if (!msgReader) throw new ArgumentException('missing MessageValueReader to read argument ' + (parameter.name ?? parameter.propertyKey ?? parameter.provider?.toString() ?? parameter.type?.toString()) + ' of ' + (parameter.target ? getTypeName(parameter.target) : 'unknown') + '.' + (parameter.propertyKey?.toString() ?? ''));

            const res = msgReader.read(parameter.field ?? parameter.name, context.getPayload(), parameter.scope);
            if (!res.success) {
                return next(parameter, context);
            }

            if (!pipe || (isNil(res.value) && (parameter.nullable || 
                    (parameter.flags && (parameter.flags & InjectFlags.Optional) > 0))
                )) {
                return res.value;
            }
            if (parameter.multi) {
                const value = getMutilResolveHanlder(context.getInjector().getRuntime()).handle([isString(res.value) ? res.value.split(',') : res.value, pipe, parameter], context);
                if (isResolved(value)) return value;
            } else {
                return pipe.transform(res.value, ...parameter.args || []);
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
