import {
    DecorDefine, Type, Injector, lang, EMPTY, refl, isPromise, isString, isFunction, isDefined, OnDestroy,
    ReflectiveResolver, TypeReflect, ReflectiveRef, DestroyCallback, InvokeOption, chain
} from '@tsdi/ioc';
import { isObservable, lastValueFrom } from 'rxjs';
import { CanActivate } from './guard';
import { ResultValue } from './result';
import { Middleware, MiddlewareFn } from '../transport/endpoint';
import { RouteRef, RouteFactory, RouteFactoryResolver, joinprefix } from './route';
import { ProtocolRouteMappingMetadata, RouteMappingMetadata } from './router';
import { TransportContext } from '../transport/context';
import { promisify } from './promisify';
import { Protocol } from '../transport/packet';
import { ForbiddenError } from '../transport/error';


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
    protected sortRoutes: DecorDefine<ProtocolRouteMappingMetadata>[] | undefined;
    private _url: string;
    private _instance: T | undefined;
    private _endpoints: Map<string, MiddlewareFn>;

    constructor(private factory: ReflectiveRef<T>) {
        super()
        this.metadata = factory.reflect.annotation as ProtocolRouteMappingMetadata
        this._url = joinprefix(this.metadata.prefix, this.metadata.version, this.metadata.route);
        this._endpoints = new Map()
    }

    get protocol(): Protocol | undefined {
        return this.metadata.protocol;
    }

    get type() {
        return this.factory.type
    }

    get reflect() {
        return this.factory.reflect
    }

    get injector() {
        return this.factory.injector
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.factory.resolve()
        }
        return this._instance
    }

    get path(): string {
        return this._url
    }

    private _guards?: CanActivate[];
    get guards(): CanActivate[] {
        if (!this._guards) {
            this._guards = this.metadata.guards?.map(token => () => this.factory.resolve(token)) ?? EMPTY
        }
        return this._guards
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (ctx.sent || (this.protocol && this.protocol !== ctx.protocol)) return await next();
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(guard => () => promisify(guard.canActivate(ctx))),
                vaild => vaild === false))) {
                throw new ForbiddenError();
            }
        }

        const method = this.getRouteMetaData(ctx) as DecorDefine<ProtocolRouteMappingMetadata>;
        if (!method || !method.propertyKey) return await next();

        const metadate = method.metadata;
        if (metadate.protocol && this.protocol !== metadate.protocol) return await next();

        if (metadate.guards?.length) {
            if (!(await lang.some(
                metadate.guards.map(token => () => promisify(this.factory.resolve(token)?.canActivate(ctx))),
                vaild => vaild === false))) {
                throw new ForbiddenError();
            }
        }


        const key = `${metadate.method ?? ctx.method} ${method.propertyKey}`;
        let endpoint = this._endpoints.get(key);
        if (!endpoint) {
            const endpoints = this.getRouteMiddleware(ctx, method)?.map(c => this.parse(c)) ?? [];
            endpoints.push(async (c, n) => {
                await this.response(c, method)
            });
            endpoint = chain(endpoints);
            this._endpoints.set(key, endpoint)
        }
        return await endpoint(ctx, next)

    }

    parse(middleware: Middleware): MiddlewareFn {
        return (ctx, next) => middleware.invoke(ctx, next)
    }

    async response(ctx: TransportContext, meta: DecorDefine): Promise<void> {

        const route: string = meta.metadata.route;
        if (route && isRest.test(route)) {
            const restParams: any = {};
            const routes = route.split('/').map(r => r.trim());
            const restParamNames = routes.filter(d => restParms.test(d));
            const routeUrls = ctx.url.replace(this.path, '').split('/');
            let has = false;
            restParamNames.forEach(pname => {
                const val = routeUrls[routes.indexOf(pname)];
                if (val) {
                    has = true;
                    restParams[pname.substring(1)] = val
                }
            });
            if (has) {
                ctx.restfulParams = { ...ctx.restfulParams, ...restParams }
            }
        }


        let result = this.factory.invoke(
            meta.propertyKey,
            {
                context: ctx
            },
            this.instance);

        if (isPromise(result)) {
            result = await result
        } else if (isObservable(result)) {
            result = await lastValueFrom(result)
        }

        // middleware.
        if (isFunction(result)) {
            return await result(ctx)
        }

        if (result instanceof ResultValue) {
            return await result.sendValue(ctx)
        }

        if (isDefined(result)) {
            ctx.body = result
        } else {
            ctx.body = {};
            ctx.ok = true
        }
    }

    protected getRouteMiddleware(ctx: TransportContext, meta: DecorDefine<ProtocolRouteMappingMetadata>): Middleware[] {
        if (this.metadata.middlewares?.length || meta.metadata.middlewares?.length) {
            return [...this.metadata.middlewares || EMPTY, ...meta.metadata.middlewares || EMPTY]
        }
        return EMPTY
    }

    protected getRouteMetaData(ctx: TransportContext) {
        const subRoute = ctx.url.replace(this.path, '') || '/';
        if (!this.sortRoutes) {
            this.sortRoutes = this.reflect.class.methodDecors
                .filter(m => m && isString((m.metadata as RouteMappingMetadata).route))
                .sort((ra, rb) => ((rb.metadata as RouteMappingMetadata).route || '').length - ((ra.metadata as RouteMappingMetadata).route || '').length) as DecorDefine<ProtocolRouteMappingMetadata>[]

        }

        const allMethods = this.sortRoutes.filter(m => m && m.metadata.method === ctx.method);

        let meta = allMethods.find(d => (d.metadata.route || '') === subRoute);
        if (!meta) {
            meta = allMethods.find(route => {
                const uri = route.metadata.route || '';
                if (isRest.test(uri)) {
                    const idex = uri.indexOf('/:');
                    const url = uri.substring(0, idex);
                    if (url !== subRoute && subRoute.indexOf(url) === 0) {
                        return true
                    }
                }
                return false
            })
        }
        return meta
    }

    get destroyed() {
        return this._destroyed
    }

    destroy(): void | Promise<void> {
        if (!this._destroyed) {
            this._destroyed = true;

            this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy())

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

    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (callback) {
            this._dsryCbs.add(callback)
        } else {
            return this.destroy()
        }
    }
}


export class DefaultRouteFactory<T = any> extends RouteFactory<T> {
    private routeRef?: RouteRef<T>;
    constructor(readonly reflect: TypeReflect<T>) {
        super()
    }
    create(injector: Injector, option?: InvokeOption): RouteRef<T> {
        const factory = injector.get(ReflectiveResolver).resolve(this.reflect, injector, option);
        return this.routeRef = new RouteMappingRef(factory)
    }

    last(): RouteRef<T> | undefined {
        return this.routeRef
    }
}

export class DefaultRouteFactoryResovler extends RouteFactoryResolver {
    resolve<T>(type: Type<T> | TypeReflect<T>): RouteFactory<T> {
        return new DefaultRouteFactory<T>(isFunction(type) ? refl.get(type) : type)
    }
}

