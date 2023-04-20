import { ArgumentExecption, ClassType, composeResolver, EMPTY, getClass, isArray, isBasic, isDefined, isPrimitiveType, isString, Parameter } from '@tsdi/ioc';
import { getPipe, TransportArgumentResolver, TransportParameter } from './resolver';
import { EndpointContext } from './context';


export function missingPipeExecption(parameter: Parameter, type?: ClassType, method?: string) {
    return new ArgumentExecption(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
}



// export const primitiveResolvers: TransportArgumentResolver[] = [];

export function createPayloadResolver<T extends EndpointContext>(getPayload: (ctx: T, scope?: string, filed?: string) => any, canResolve: (param: TransportParameter, payload: any, ctx: T) => boolean): TransportArgumentResolver[] {
    return [
        composeResolver<TransportArgumentResolver, TransportParameter, T>(
            (parameter, ctx) => canResolve(parameter, getPayload(ctx), ctx), //(parameter.scope || ctx instanceof AssetContext) && isDefined(getPayload(ctx)[parameter.scope ?? 'query']),
            composeResolver<TransportArgumentResolver, TransportParameter, T>(
                (parameter, ctx) => isPrimitiveType(parameter.type),
                {
                    canResolve(parameter, ctx) {
                        return isDefined(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name))
                    },
                    resolve(parameter, ctx) {
                        const pipe = getPipe(parameter, ctx, true);
                        if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                        return pipe.transform(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name), ...parameter.args || EMPTY)
                    }
                },
                {
                    canResolve(parameter, ctx) {
                        const val = getPayload(ctx as T, parameter.scope);
                        return !parameter.field && (isBasic(val) || parameter.type == getClass(val))
                    },
                    resolve(parameter, ctx) {
                        const pipe = getPipe(parameter, ctx, true);
                        if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                        return pipe.transform(getPayload(ctx as T, parameter.scope), ...parameter.args || EMPTY)
                    }
                }
            ),
            composeResolver<TransportArgumentResolver, TransportParameter>(
                (parameter) => isPrimitiveType(parameter.provider) && (parameter.multi === true || parameter.type === Array),
                {
                    canResolve(parameter, ctx) {
                        return isList(getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name)) // ctx.payload[parameter.scope]?.[field])
                    },
                    resolve(parameter, ctx) {
                        const value = getPayload(ctx as T, parameter.scope, parameter.field ?? parameter.name);
                        const values: any[] = isString(value) ? value.split(',') : value;
                        const pipe = getPipe(parameter, ctx, true);
                        if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                        return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                    }
                }
            ),
            {
                canResolve(parameter, ctx) {
                    return isDefined(parameter.pipe) && isDefined(getPayload(ctx as T, parameter.scope, parameter.field))
                    //  parameter.scope && (parameter.field ? ctx.payload[parameter.scope][parameter.field] : Object.keys(ctx.payload[parameter.scope]).length > 0)
                },
                resolve(parameter, ctx) {
                    const value = getPayload(ctx as T, parameter.scope, parameter.field); //parameter.field ? ctx.payload[parameter.scope!][parameter.field] : ctx.payload[parameter.scope!];
                    const pipe = getPipe(parameter, ctx);
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(value, ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.nullable === true
                },
                resolve(parameter, ctx) {
                    return null!
                }
            }
        )
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