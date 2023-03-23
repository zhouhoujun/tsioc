import { ClassType, composeResolver, EMPTY, isArray, isDefined, isNative, isPrimitiveType, isString, isToken, Token, Parameter, Type } from '@tsdi/ioc';
import { MessageArgumentExecption } from '../execptions';
import { PipeTransform } from '../pipes/pipe';
import { TransportArgumentResolver, TransportParameter } from './resolver';

export function missingPipeExecption(parameter: Parameter, type?: ClassType, method?: string) {
    return new MessageArgumentExecption(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
}

export const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => !!parameter.scope && isDefined(ctx.arguments?.[parameter.scope]),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return !!parameter.scope && isDefined(ctx.arguments[parameter.scope]?.[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const scope = ctx.arguments[parameter.scope!];
                    const pipe = (isToken(parameter.pipe) || parameter.type) ? ctx.get<PipeTransform>(parameter.pipe as Token ?? (parameter.type as Type).name.toLowerCase()) : parameter.pipe;
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(scope[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return !parameter.field && !!parameter.scope && isNative(ctx.arguments[parameter.scope])
                },
                resolve(parameter, ctx) {
                    const value = ctx.arguments[parameter.scope!];
                    const pipe = (isToken(parameter.pipe) || parameter.type) ? ctx.get<PipeTransform>(parameter.pipe as Token ?? (parameter.type as Type).name.toLowerCase()) : parameter.pipe;
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(value, ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TransportArgumentResolver, TransportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.name!;
                    return !!parameter.scope && isList(ctx.arguments[parameter.scope]?.[field])
                },
                resolve(parameter, ctx) {
                    const value = ctx.arguments[parameter.scope!][parameter.field ?? parameter.name!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = (isToken(parameter.pipe) || parameter.type) ? ctx.get<PipeTransform>(parameter.pipe as Token ?? (parameter.provider as Type).name.toLowerCase()) : parameter.pipe;
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            }
        ),
        {

            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope
                    && (parameter.field ? ctx.arguments[parameter.scope][parameter.field] : Object.keys(ctx.arguments[parameter.scope]).length > 0)
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.arguments[parameter.scope!][parameter.field] : ctx.arguments[parameter.scope!];
                const pipe = isToken(parameter.pipe) ? ctx.get<PipeTransform>(parameter.pipe) : parameter.pipe;
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


export function isList(target: any) {
    return isArray(target) || isString(target);
}