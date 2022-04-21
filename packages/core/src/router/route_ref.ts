import {
    DecorDefine, Type, Injector, lang, EMPTY, refl,
    isPrimitiveType, isPromise, isString, isArray, isFunction, isDefined,
    composeResolver, Parameter, ClassType, ArgumentError, OperationFactoryResolver,
    OnDestroy, isClass, TypeReflect, OperationFactory, DestroyCallback, EMPTY_OBJ, chain
} from '@tsdi/ioc';
import { from, isObservable, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanActivate } from './guard';
import { ResultValue } from './result';
import { InterceptorChain, Middleware, MiddlewareFn } from '../transport/endpoint';
import { RequestBase, ServerResponse } from '../transport/packet';
import { TransportArgumentResolver, TransportParameter } from '../transport/resolver';
import { MODEL_RESOLVERS } from '../model/model.resolver';
import { PipeTransform } from '../pipes/pipe';
import { RouteRef, RouteOption, RouteFactory, RouteFactoryResolver, joinprefix, RESTFUL_PARAMS } from './route';
import { ProtocolRouteMappingMetadata, RouteMappingMetadata } from './router';
import { promisify, TransportContext } from '../transport/context';


const isRest = /\/:/;
const restParms = /^\S*:/;
// const noParms = /\/\s*$/;


/**
 * route mapping ref.
 */
export class RouteMappingRef<T> extends RouteRef<T> implements OnDestroy {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private metadata: ProtocolRouteMappingMetadata;
    protected sortRoutes: DecorDefine[] | undefined;
    private _url: string;
    private _instance: T | undefined;
    private _endpoints: Map<string, MiddlewareFn[]>;

    constructor(private factory: OperationFactory<T>, prefix?: string) {
        super();
        this.metadata = factory.reflect.annotation as ProtocolRouteMappingMetadata;
        this._url = joinprefix(prefix, this.metadata.version, this.metadata.route);
        this._endpoints = new Map();
    }

    get type() {
        return this.factory.type;
    }

    get reflect() {
        return this.factory.reflect;
    }

    get injector() {
        return this.factory.injector;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.factory.resolve();
        }
        return this._instance;
    }

    get path(): string {
        return this._url;
    }

    private _guards?: CanActivate[];
    get guards(): CanActivate[] {
        if (!this._guards) {
            this._guards = this.metadata.guards?.map(token => () => this.factory.resolve(token)) ?? EMPTY;
        }
        return this._guards;
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const method = await this.canActivate(ctx);

        if (method) {
            const metadate = method.metadata;
            const key = `${metadate.method ?? ctx.method} ${method.propertyKey}`;
            let endpoint = this._endpoints.get(key);
            if (!endpoint) {
                endpoint = this.getRouteMiddleware(ctx, method)?.map(c=> this.parse(c)) ?? [];
                endpoint.push((c, n)=> this.response(c, n, method))
                this._endpoints.set(key, endpoint);
            }
            return await chain(endpoint, ctx, next);
        } else if (method === false) {
            ctx.throwError(403);
        } else {
            return await next();
        }
    }

    parse(middleware: Middleware): MiddlewareFn {
        return (ctx, next) => middleware.invoke(ctx, next);
    }

    protected async canActivate(ctx: TransportContext) {
        if (ctx.sent) return null;
        // if (!ctx.pattern.startsWith(this.path)) return null;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(guard => () => promisify(guard.canActivate(ctx))),
                vaild => vaild === false))) {
                return false;
            };
        }
        const meta = this.getRouteMetaData(ctx) as DecorDefine<RouteMappingMetadata>;
        if (!meta || !meta.propertyKey) return null;
        let rmeta = meta.metadata;
        if (rmeta.guards?.length) {
            if (!(await lang.some(
                rmeta.guards.map(token => () => promisify(this.factory.resolve(token)?.canActivate(ctx))),
                vaild => vaild === false))) {
                return false;
            }
        }
        return meta;
    }

    async response(ctx: TransportContext, next: () => Promise<void>, meta: DecorDefine): Promise<void> {
        const injector = this.injector;

        let restParams: any = {};
        const route: string = meta.metadata.route;
        if (route && isRest.test(route)) {
            let routes = route.split('/').map(r => r.trim());
            let restParamNames = routes.filter(d => restParms.test(d));
            let routeUrls = ctx.url.replace(this.path, '').split('/');
            restParamNames.forEach(pname => {
                let val = routeUrls[routes.indexOf(pname)];
                if (val) {
                    restParams[pname.substring(1)] = val;
                    // req.context.setArgument(pname.substring(1), val);
                }
            });
        }
        ctx.setValue(RESTFUL_PARAMS, restParams ?? EMPTY_OBJ);

        let result = this.factory.invoke(
            meta.propertyKey,
            {
                context: ctx,
                resolvers: [
                    ...primitiveResolvers,
                    ...injector.get(MODEL_RESOLVERS) ?? EMPTY,
                ]
            },
            this.instance);

        if (isPromise(result)) {
            result = await result;
        } else if (isObservable(result)) {
            result = await lastValueFrom(result);
        }

        // middleware.
        if (isFunction(result)) {
            return await result(ctx);
        }

        if (result instanceof ResultValue) {
            return await result.sendValue(ctx);
        }

        if (isDefined(result)) {
            ctx.body = result;
        } else {
            ctx.ok = true;
        }

    }

    protected getRouteMiddleware(ctx: TransportContext, meta: DecorDefine): Middleware[] {
        if (this.metadata.middlewares?.length || (meta.metadata as RouteMappingMetadata).middlewares?.length) {
            return [...this.metadata.middlewares || EMPTY, ...(meta.metadata as RouteMappingMetadata).middlewares || EMPTY];
        }
        return EMPTY;
    }

    protected getRouteMetaData(ctx: TransportContext) {
        let subRoute = ctx.url.replace(this.path, '');
        if (!this.sortRoutes) {
            this.sortRoutes = this.reflect.class.methodDecors
                .filter(m => m && isString((m.metadata as RouteMappingMetadata).route))
                .sort((ra, rb) => ((rb.metadata as RouteMappingMetadata).route || '').length - ((ra.metadata as RouteMappingMetadata).route || '').length);

        }

        let allMethods = this.sortRoutes.filter(m => m && m.metadata.method === ctx.method);

        let meta = allMethods.find(d => (d.metadata.route || '') === subRoute);
        if (!meta) {
            meta = allMethods.find(route => {
                let uri = route.metadata.route || '';
                if (isRest.test(uri)) {
                    let idex = uri.indexOf('/:');
                    let url = uri.substring(0, idex);
                    if (url !== subRoute && subRoute.indexOf(url) === 0) {
                        return true;
                    }
                }
                return false;
            });
        }
        return meta;
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void | Promise<void> {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this.sortRoutes = null!;
                this.metadata = null!
                this._url = null!;
                this._instance = null!;
                const factory = this.factory;
                this.factory = null!;

                return factory.onDestroy();
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (callback) {
            this._dsryCbs.add(callback);
        } else {
            return this.destroy();
        }
    }
}

export function missingPipeError(parameter: Parameter, type?: ClassType, method?: string) {
    return new ArgumentError(`missing pipe to transform argument ${parameter.paramName} type, method ${method} of class ${type}`);
}

const primitiveResolvers: TransportArgumentResolver[] = [
    composeResolver<TransportArgumentResolver, TransportParameter>(
        (parameter, ctx) => ctx instanceof TransportContext && isDefined(parameter.field ?? parameter.paramName),
        composeResolver<TransportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'query' && isDefined(ctx.request.params[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return pipe.transform(ctx.request.params[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.getValue(RESTFUL_PARAMS)[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return pipe.transform(ctx.getValue(RESTFUL_PARAMS)[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.request.body[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return pipe.transform(ctx.request.body[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    return !parameter.scope && isDefined(ctx.request.params[field] ?? ctx.getValue(RESTFUL_PARAMS)[field] ?? ctx.request.body[field])
                },
                resolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return pipe.transform(ctx.request.params[field] ?? ctx.getValue(RESTFUL_PARAMS)[field] ?? ctx.request.body[field], ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TransportArgumentResolver, TransportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    return parameter.scope === 'query' && (isArray(ctx.request.params[field]) || isString(ctx.request.params[field]));
                },
                resolve(parameter, ctx) {
                    const value = ctx.request.body[parameter.field ?? parameter.paramName!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.getValue(RESTFUL_PARAMS)[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const value = (ctx.getValue(RESTFUL_PARAMS)[parameter.field ?? parameter.paramName!] as string).split(',');
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return isArray(ctx.request.body[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const value: any[] = ctx.request.body[parameter.field ?? parameter.paramName!];
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;;
                }
            }
        ),
        {

            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope === 'body'
                    && (parameter.field ? ctx.request.body[parameter.field] : Object.keys(ctx.request.body).length > 0);
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.request.body[parameter.field] : ctx.request.body;
                const pipe = ctx.get<PipeTransform>(parameter.pipe!);
                if (!pipe) throw missingPipeError(parameter, ctx.targetType, ctx.methodName);
                return pipe.transform(value, ...parameter.args || EMPTY);
            }
        },
        {
            canResolve(parameter, ctx) {
                return parameter.nullable === true;
            },
            resolve(parameter, ctx) {
                return undefined as any;
            }
        }
    )
]

export class DefaultRouteFactory<T = any> extends RouteFactory<T> {
    private routeRef?: RouteRef<T>;
    constructor(readonly reflect: TypeReflect<T>) {
        super()
    }
    create(injector: Injector, option?: RouteOption): RouteRef<T> {
        const factory = injector.get(OperationFactoryResolver).resolve(this.reflect, injector, option);
        if (option?.prefix) {
            factory.context.setValue('prefix', option?.prefix);
        }
        return this.routeRef = new RouteMappingRef(factory, option?.prefix);
    }

    last(): RouteRef<T> | undefined {
        return this.routeRef;
    }
}

export class DefaultRouteFactoryResovler extends RouteFactoryResolver {
    resolve<T>(type: Type<T> | TypeReflect<T>): RouteFactory<T> {
        return new DefaultRouteFactory<T>(isFunction(type) ? refl.get(type) : type);
    }
}