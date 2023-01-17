import { Abstract, ArgumentExecption, BASE_RESOLVERS, ClassType, composeResolver, EMPTY, EMPTY_OBJ, Injector, InvokeArguments, isArray, isDefined, isPrimitiveType, isString, lang, MissingParameterExecption, OperationArgumentResolver, Parameter, ProviderType, StaticProvider, Token, Type } from '@tsdi/ioc';
import { Runner } from '../metadata';
import { OnDispose } from '../lifecycle';
import { TransportEndpoint, TransportOpts } from './transport';
import { AssetContext, ServerEndpointContext } from './context';
import { MiddlewareBackend, MiddlewareLike, MiddlewareType } from './middleware';
import { Incoming, Outgoing } from './packet';
import { MODEL_RESOLVERS } from './model';
import { TransportArgumentExecption } from './execptions';
import { TransportArgumentResolver, TransportParameter } from './resolver';
import { PipeTransform } from '../pipes/pipe';


/**
 * server options.
 */
@Abstract()
export abstract class ServerOpts<TRequest extends Incoming = any, TResponse extends Outgoing = any> extends TransportOpts<TRequest, TResponse> {
    /**
     * middlewares of server.
     */
    abstract middlewares?: MiddlewareType[];
    /**
     * the mutil token to register middlewares in the server context.
     */
    abstract middlewaresToken?: Token<MiddlewareLike[]>;

    abstract listenOpts?: any;

    abstract proxy?: boolean;
}

/**
 * get middleware backend.
 * @param deps 
 * @returns 
 */
export function getMiddlewareBackend(...deps: Token[]): StaticProvider<MiddlewareBackend> {
    return {
        provide: MiddlewareBackend,
        useFactory(middlewares: MiddlewareLike[]) {
            return new MiddlewareBackend(middlewares)
        },
        deps
    }
}

/**
 * abstract server.
 */
@Abstract()
@Runner('start')
export abstract class Server<
    TRequest extends Incoming = any,
    TResponse extends Outgoing = any,
    Tx extends ServerEndpointContext = ServerEndpointContext,
    Opts extends ServerOpts<TRequest, TResponse> = any>

    extends TransportEndpoint<TRequest, TResponse, Opts> implements OnDispose {

    private _midlsToken!: Token<MiddlewareLike[]>;

    get proxy(): boolean {
        return this.getOptions().proxy === true;
    }

    /**
     * start server.
     */
    abstract start(): Promise<void>;

    /**
     * middlewares are executed on the transport request object before the
     * request is decoded.
     * @param middleware 
     */
    use(middleware: MiddlewareType<Tx>, order?: number): this {
        this.multiOrder(this._midlsToken, middleware, order);
        this.resetEndpoint();
        return this
    }


    /**
     * init options.
     * @param options 
     * @returns 
     */
    protected override initOption(options?: Opts): Opts {
        const defOpts = this.getDefaultOptions();
        const providers = options && options.providers ? [...this.defaultProviders(), ...options.providers] : this.defaultProviders();
        const opts = { ...defOpts, ...options, providers };
        if (!opts.backend && opts.middlewaresToken) {
            opts.backend = getMiddlewareBackend(opts.middlewaresToken);
        }
        return opts as Opts;
    }

    protected getDefaultOptions(): Opts {
        return EMPTY_OBJ as Opts;
    }

    protected defaultProviders(): ProviderType[] {
        return EMPTY;
    }

    /**
     * initialize middlewares, interceptors, execptions with options.
     * @param options 
     */
    protected override initContext(options: Opts) {
        super.initContext(options);

        const mToken = this._midlsToken = options.middlewaresToken!;
        if (!mToken) {
            throw new ArgumentExecption(lang.getClassName(this) + ' options middlewaresToken is missing.');
        }

        if (options.middlewares && options.middlewares.length) {
            const filter = this.context.get(MiddlewareFilter);
            const middlewares = filter ? filter.filter(options.middlewares, options) : options.middlewares;
            this.multiReg(mToken, middlewares);
        }
    }

    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close()
        await this.context.destroy();
    }

}

@Abstract()
export abstract class MiddlewareFilter {
    abstract filter(middlewares: MiddlewareType[], opts: Record<string, any>): MiddlewareType[];
}



/**
 * server context options.
 */
export interface ServerContextOpts extends InvokeArguments {

}

/**
 * server context with model reovlers.
 */
@Abstract()
export abstract class ServerContext<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing> extends AssetContext<TRequest, TResponse> {

    
    protected _explicitStatus?: boolean;
    private _status?: number;

    constructor(injector: Injector, public request: TRequest, readonly response: TResponse, readonly target: Server, options?: ServerContextOpts) {
        super(injector, options);
    }


    get status(): number {
        if (this._status === undefined) {
            this.notFound = true;
        }
        return this._status!;
    }

    set status(status: number) {
        if (this.sent) return;
        this._explicitStatus = true;
        const chged = this._status !== status;
        this._status = status;
        if (chged) {
            this.onStatusChanged(status);
        }
        if (this.body && this.isEmptyStatus(status)) this.body = null;
    }

    protected onStatusChanged(status: number) {

    }


    protected override getDefaultResolvers(): OperationArgumentResolver[] {
        return [
            ...primitiveResolvers,
            ...this.injector.get(MODEL_RESOLVERS, EMPTY),
            ...BASE_RESOLVERS
        ];
    }

    protected isSelf(token: Token) {
        return token === ServerEndpointContext || token === ServerContext;
    }

    protected override missingExecption(missings: Parameter<any>[], type: ClassType<any>, method: string): MissingParameterExecption {
        throw new TransportMissingExecption(missings, type, method)
    }

}

export class TransportMissingExecption extends MissingParameterExecption {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
        super(parameters, type, method)
    }
}



export function missingPipeExecption(parameter: Parameter, type?: ClassType, method?: string) {
    return new TransportArgumentExecption(`missing pipe to transform argument ${parameter.name} type, method ${method} of class ${type}`)
}

const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => ctx instanceof ServerEndpointContext && isDefined(parameter.field ?? parameter.name),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'query' && isDefined(ctx.query[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase())!;
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.query[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && ctx.restfulParams && isDefined(ctx.restfulParams[parameter.field ?? parameter.name!])
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
                    return pipe.transform(ctx.restfulParams[parameter.field ?? parameter.name!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.playload[parameter.field ?? parameter.name!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.type as Type)?.name.toLowerCase());
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
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
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
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
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
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
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
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
                    if (!pipe) throw missingPipeExecption(parameter, ctx.targetType, ctx.methodName)
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
