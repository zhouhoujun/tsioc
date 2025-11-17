import { ArgumentException, AbstractType, isArray, isString, Parameter, ResolveInterceptorLike, ContextToken, RuntimeHandler, Runtime, isToken, isPrimitive, isFunction, getTypeName, createResolveHandler, isResolved, isNil, isObject, isDefined } from '@tsdi/ioc';
import { ParameterScope, TransportParameter } from './resolver';
import { PipeTransform } from '../pipes/pipe';


export function missingPipeException<T>(parameter: Parameter<T>, type?: AbstractType, method?: string | symbol) {
    let message = `missing pipe to transform argument ${ parameter.name ?? parameter.propertyKey ?? parameter.provider?.toString() ?? parameter.type?.toString() } type`;
    if(method) {
        message += `, method ${method.toString()}`
    }
    if(type) {
        message += ` of class ${getTypeName(type)}`
    }
    return new ArgumentException(message)
}


const MUTIL_RESOLVE_HANDLER = new ContextToken<RuntimeHandler>(() => null!);
export function getMutilResolveHanlder(runtime: Runtime): RuntimeHandler<[any, PipeTransform, TransportParameter]> {
    let scope = runtime.get(MUTIL_RESOLVE_HANDLER);
    if (!scope) {
        scope = createResolveHandler<[any, PipeTransform, TransportParameter], any>(
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


export function createPayloadResolveInterceptors(getPayload: (input: any, scope?: ParameterScope, filed?: string) => any): ResolveInterceptorLike<TransportParameter>[] {
    return [
        (parameter, next, context) => {
            const injector = context.getInjector();
            let pipe: PipeTransform | undefined;
            if (parameter.pipe) {
                pipe = isToken(parameter.pipe) ? injector.get<PipeTransform>(parameter.pipe) : parameter.pipe;
            } else if (parameter.multi && isFunction(parameter.provider)) {
                pipe = injector.get<PipeTransform>(isPrimitive(parameter.provider) ? parameter.provider.name.toLowerCase() : getTypeName(parameter.provider));
            } else if (parameter.type && isPrimitive(parameter.type)) {
                pipe = injector.get<PipeTransform>(parameter.type.name.toLowerCase());
            } else {
                return next(parameter, context);
            }

            if (!pipe) throw missingPipeException(parameter, context.target!, parameter.propertyKey);

            let payload = getPayload(context.getPayload(), parameter.scope, parameter.field ?? parameter.name);
            if (isNil(payload)) {
                const data = getPayload(context.getPayload(), parameter.scope);
                if (isDefined(data) && !isObject(data)) {
                    payload = data;
                } else if (parameter.nullable) {
                    return parameter.defaultValue ?? null;
                } else {
                    return next(parameter, context);
                }
            }


            if (parameter.multi) {
                const value = getMutilResolveHanlder(context.getRuntime()).handle([isString(payload) ? payload.split(',') : payload, pipe, parameter], context);
                if (isResolved(value)) return value;
            } else {
                return pipe.transform(payload, ...parameter.args || [])
            }
        }
    ];
}


/**
 * is list or not.
 * @param target 
 * @returns 
 */
export function isList(target: any) {
    return isArray(target) || isString(target);
}
