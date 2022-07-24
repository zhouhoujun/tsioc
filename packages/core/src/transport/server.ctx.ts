import {
    Abstract, ClassType, composeResolver, isArray, isDefined, isPrimitiveType, isString,
    Injector, InvokeArguments, MissingParameterError, Parameter, Token, Type, EMPTY, TypeOf, isFunction
} from '@tsdi/ioc';
import { MODEL_RESOLVERS } from './model';
import { PipeTransform } from '../pipes/pipe';
import { TransportContext } from './context';
import { TransportArgumentError } from './error';
import { TransportArgumentResolver, TransportParameter } from './resolver';
import { TransportServer } from './server';
import { Protocol } from './protocol';

export interface ServerContextOpts extends InvokeArguments {
    protocol?: TypeOf<Protocol>
}

/**
 * server transport context.
 */
@Abstract()
export abstract class ServerContext<TRequest = any, TResponse = any> extends TransportContext {
    /**
     * context protocol.
     */
    readonly protocol: Protocol;

    constructor(injector: Injector, public request: TRequest, readonly response: TResponse, readonly target: TransportServer, options?: ServerContextOpts) {
        super(injector, {
            ...options,
            resolvers: [
                ...options?.resolvers ?? EMPTY,
                ...primitiveResolvers,
                ...injector.get(MODEL_RESOLVERS, EMPTY)
            ]
        });
        if (options?.protocol) {
            this.protocol = isFunction(options.protocol) ? this.resolve(options.protocol) : options.protocol;
        } else {
            this.protocol = injector.get(Protocol);
        }
    }

    protected isSelf(token: Token) {
        return token === TransportContext || token === ServerContext;
    }

    override missingError(missings: Parameter<any>[], type: ClassType<any>, method: string): MissingParameterError {
        return new TransportMissingError(missings, type, method)
    }

}

export class TransportMissingError extends MissingParameterError {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(parameters, type, method)
    }
}



export function missingPipeError(parameter: Parameter, type?: ClassType, method?: string) {
    return new TransportArgumentError(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
}

const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => ctx instanceof TransportContext && isDefined(parameter.field ?? parameter.name),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'query' && isDefined(ctx.query[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase())!;
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.query[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.restfulParams[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.playload[parameter.field ?? parameter.name!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.playload[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.name!;
                    return !parameter.scope && isDefined(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.playload?.[field])
                },
                resolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.name!;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.query[field] ?? ctx.restfulParams?.[field] ?? ctx.playload[field], ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TransportArgumentResolver, TransportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.name!;
                    return parameter.scope === 'query' && (isArray(ctx.query[field]) || isString(ctx.query[field]))
                },
                resolve(parameter, ctx) {
                    const value = ctx.playload[parameter.field ?? parameter.name!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase())!;
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const value = (ctx.restfulParams[parameter.field ?? parameter.name!] as string).split(',');
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            },
            {
                canResolve(parameter, ctx) {
                    return isArray(ctx.playload[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const value: any[] = ctx.playload[parameter.field ?? parameter.name!];
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any
                }
            }
        ),
        {

            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope === 'body'
                    && (parameter.field ? ctx.playload[parameter.field] : Object.keys(ctx.playload).length > 0)
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.playload[parameter.field] : ctx.playload;
                const pipe = ctx.get<PipeTransform>(parameter.pipe!);
                if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName)
                return pipe.transform(value, ...parameter.args || EMPTY)
            }
        },
        {
            canResolve(parameter, ctx) {
                return parameter.nullable === true
            },
            resolve(parameter, ctx) {
                return undefined as any
            }
        }
    )
]
