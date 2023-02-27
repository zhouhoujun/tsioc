import {
    DecorDefine, Type, Injector, lang, EMPTY, refl, isPromise, isString, isFunction, isDefined, OnDestroy,
    ReflectiveFactory, ReflectiveRef, DestroyCallback, pomiseOf, InvokeArguments, Class, isType, TypeOf
} from '@tsdi/ioc';
import { isObservable, lastValueFrom } from 'rxjs';
import { CanActivate } from '../guard';
import { ResultValue } from './result';
import { ForbiddenExecption } from '../execptions';
import { ServerEndpointContext } from '../transport/context';
import { Interceptor } from '../Interceptor';
import { Middleware, MiddlewareFn, InterceptorMiddleware } from '../transport/middleware';
import { RouteRef, RouteFactory, RouteFactoryResolver, joinprefix } from './route';
import { ProtocolRouteMappingMetadata, RouteMappingMetadata } from './router';


const isRest = /\/:/;
const restParms = /^\S*:/;


/**
 * route mapping ref.
 */
export class RouteMappingRef<T> extends RouteRef<T> implements OnDestroy {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private metadata: ProtocolRouteMappingMetadata;
    protected sortRoutes: DecorDefine<ProtocolRouteMappingMetadata>[] | undefined;
    private _url: string;
    private _endpoints: Map<string, MiddlewareFn>;

    constructor(private factory: ReflectiveRef<T>) {
        super()
        this.metadata = factory.class.annotation as ProtocolRouteMappingMetadata
        this._url = joinprefix(this.metadata.prefix, this.metadata.version, this.metadata.route);
        this._endpoints = new Map()
    }

    get type() {
        return this.factory.type
    }

    get typeRef() {
        return this.factory.class
    }

    get injector() {
        return this.factory.injector
    }

    get instance(): T {
        return this.factory.getInstance()
    }

    get path(): string {
        return this._url
    }

    private _guards?: CanActivate[];
    get guards(): CanActivate[] {
        if (!this._guards) {
            this._guards = this.metadata.guards?.map(g => isFunction(g) ? this.factory.resolve(g) : g) ?? EMPTY
        }
        return this._guards
    }


    private _intptors?: Interceptor[];
    get interceptors(): Interceptor[] {
        if (!this._intptors) {
            this._intptors = this.metadata.interceptors?.map(i => isFunction(i) ? this.factory.resolve(i) : i) ?? EMPTY;
        }
        return this._intptors;
    }

    async invoke(ctx: ServerEndpointContext, next: () => Promise<void>): Promise<void> {
        if (ctx.sent) return await next();

        const method = this.getRouteMetaData(ctx) as DecorDefine<ProtocolRouteMappingMetadata>;
        if (!method || !method.propertyKey) {
            ctx.status = ctx.statusFactory.create('NotFound');
            return await next();
        }

        const metadate = method.metadata;

        if (metadate.guards?.length) {
            if (!(await lang.some(
                metadate.guards.map(token => () => pomiseOf((isFunction(token) ? this.factory.resolve(token) : token)?.canActivate(ctx))),
                vaild => vaild === false))) {
                throw new ForbiddenExecption();
            }
        }


        const key = `${metadate.method ?? ctx.method} ${method.propertyKey}`;
        let endpoint = this._endpoints.get(key);
        if (!endpoint) {
            const inptors: Interceptor[] = this.getRouteInterceptors(ctx, method)?.map(c => isType(c) ? this.injector.get(c as Type) : c) ?? [];
            endpoint = inptors.length ? this.parse(new InterceptorMiddleware({
                invoke: c => this.response(c, method)
            }, inptors)) : (ctx, next) => this.response(ctx, method);
            this._endpoints.set(key, endpoint)
        }
        return await endpoint(ctx, next)

    }

    parse(middleware: Middleware): MiddlewareFn {
        return (ctx, next) => middleware.invoke(ctx, next)
    }

    async response(ctx: ServerEndpointContext, meta: DecorDefine): Promise<void> {

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
            ctx,
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

    protected getRouteInterceptors(ctx: ServerEndpointContext, meta: DecorDefine<ProtocolRouteMappingMetadata>): TypeOf<Interceptor>[] {
        if (meta.metadata.interceptors?.length) {
            return [...meta.metadata.interceptors || EMPTY]
        }
        return EMPTY
    }

    protected getRouteMetaData(ctx: ServerEndpointContext) {
        const subRoute = ctx.url.replace(this.path, '') || '/';
        if (!this.sortRoutes) {
            this.sortRoutes = this.typeRef.methodDecors
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
    constructor(readonly typeRef: Class<T>) {
        super()
    }
    create(injector: Injector, option?: InvokeArguments): RouteRef<T> {
        const factory = injector.get(ReflectiveFactory).create(this.typeRef, injector, option);
        return this.routeRef = new RouteMappingRef(factory)
    }

    last(): RouteRef<T> | undefined {
        return this.routeRef
    }
}

export class DefaultRouteFactoryResovler extends RouteFactoryResolver {
    resolve<T>(type: Type<T> | Class<T>): RouteFactory<T> {
        return new DefaultRouteFactory<T>(isFunction(type) ? refl.get(type) : type)
    }
}

