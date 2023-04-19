import { ArgumentExecption, ClassType, composeResolver, EMPTY, getClass, isArray, isBasic, isDefined, isPrimitiveType, isString, Parameter } from '@tsdi/ioc';
import { getPipe, TransportArgumentResolver, TransportParameter } from './resolver';
import { AssetContext } from '../transport/context';

export function missingPipeExecption(parameter: Parameter, type?: ClassType, method?: string) {
    return new ArgumentExecption(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
}

export const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => (parameter.scope || ctx instanceof AssetContext) && isDefined(ctx.payload?.[parameter.scope ?? 'query']),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return isDefined(ctx.payload[parameter.scope ?? 'query']?.[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const scope = ctx.payload[parameter.scope ?? 'query'];
                    const pipe = getPipe(parameter, ctx, true);
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(scope[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return !parameter.field && (isBasic(ctx.payload[parameter.scope?? 'query']) || parameter.type == getClass(ctx.payload[parameter.scope ?? 'query']))
                },
                resolve(parameter, ctx) {
                    const value = ctx.payload[parameter.scope!];
                    const pipe = getPipe(parameter, ctx, true);
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(value, ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TransportArgumentResolver, TransportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.multi === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.name!;
                    return !!parameter.scope && isList(ctx.payload[parameter.scope]?.[field])
                },
                resolve(parameter, ctx) {
                    const value = ctx.payload[parameter.scope!][parameter.field ?? parameter.name!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = getPipe(parameter, ctx, true);
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            }
        ),
        {
            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope
                    && (parameter.field ? ctx.payload[parameter.scope][parameter.field] : Object.keys(ctx.payload[parameter.scope]).length > 0)
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.payload[parameter.scope!][parameter.field] : ctx.payload[parameter.scope!];
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


/**
 * is list or not.
 * @param target 
 * @returns 
 */
export function isList(target: any) {
    return isArray(target) || isString(target);
}