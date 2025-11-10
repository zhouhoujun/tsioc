import { ArgumentException, AbstractType, isArray, isString, Parameter, ResolveInterceptorLike, ContextToken, RuntimeHandler, Runtime, isToken, isPrimitive, isFunction, getTypeName, createResolveScope, isResolved, isNil, isObject, isDefined } from '@tsdi/ioc';
import { ParameterScope, TransportParameter } from './resolver';
import { HandleContext } from './context';
import { PipeTransform } from '../pipes/pipe';


export function missingPipeException<T>(parameter: Parameter<T>, type?: AbstractType, method?: string | symbol) {
    return new ArgumentException(`missing pipe to transform argument ${parameter.name} type, method ${method?.toString()} of class ${type}`)
}


const ITERABLE_RESOLVER = new ContextToken<RuntimeHandler>(() => null!);
export function getIterableResolver(runtime: Runtime): RuntimeHandler<[any, PipeTransform, TransportParameter], HandleContext> {
    let scope = runtime.get(ITERABLE_RESOLVER);
    if (!scope) {
        scope = createResolveScope<[any, PipeTransform, TransportParameter], any, HandleContext>(
            runtime,
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
        runtime.set(ITERABLE_RESOLVER, scope);
    }
    return scope;
}


export function createPayloadResolver<T extends HandleContext>(getPayload: (ctx: T, scope?: ParameterScope, filed?: string) => any): ResolveInterceptorLike<TransportParameter, T>[] {
    return [
        (parameter, next, ctx) => {

            let pipe: PipeTransform | undefined;
            if (parameter.pipe) {
                pipe = isToken(parameter.pipe) ? ctx.get<PipeTransform>(parameter.pipe) : parameter.pipe;
            } else if (parameter.multi && isFunction(parameter.provider)) {
                pipe = ctx.get<PipeTransform>(isPrimitive(parameter.provider) ? parameter.provider.name.toLowerCase() : getTypeName(parameter.provider));
            } else if (parameter.type && isPrimitive(parameter.type)) {
                pipe = ctx.get<PipeTransform>(parameter.type.name.toLowerCase());
            } else {
                return next(parameter, ctx);
            }

            if (!pipe) throw missingPipeException(parameter, ctx.targetType, ctx.propertyKey);

            let payload = getPayload(ctx, parameter.scope, parameter.field ?? parameter.name);
            if (isNil(payload)) {
                const data = getPayload(ctx, parameter.scope);
                if (isDefined(data) && !isObject(data)) {
                    payload = data;
                } else if (parameter.nullable) {
                    return parameter.defaultValue ?? null;
                } else {
                    return next(parameter, ctx);
                }
            }


            if (parameter.multi) {
                const value = getIterableResolver(ctx.getRuntime()).handle([isString(payload) ? payload.split(',') : payload, pipe, parameter], ctx);
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
