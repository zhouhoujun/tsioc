import {
    AsyncHandler, DecorDefine, Type, TypeReflect, Injector, tokenId, RegisteredState,
    isPrimitiveType, isPromise, isString, isArray, isFunction, isNil, isDefined, lang,
    chain, isObservable, OperationInvokerFactory, OperationArgumentResolver, Parameter, EMPTY
} from '@tsdi/ioc';
import { RequsetParameterMetadata } from '../metadata/decor';
import { ArgumentError, PipeTransform } from '../pipes/pipe';
import { Context } from './context';
import { CanActive } from './guard';
import { IRouter, isMiddlwareType, Middleware, MiddlewareType, RouteInfo } from './middleware';
import { ResultValue } from './result';
import { Route } from './route';
import { ResultStrategy } from './strategy';

/**
 * route mapping metadata.
 */
export interface RouteMapingMetadata {
    /**
     * route.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    route?: string;

    parent?: Type<IRouter>;

    /**
     * request method.
     */
    method?: string;

    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    contentType?: string;
    /**
     * middlewares for the route.
     *
     * @type {MiddlewareType[]}
     * @memberof RouteMetadata
     */
    middlewares?: MiddlewareType[];
    /**
     * pipes for the route.
     */
    pipes?: Type<PipeTransform>[];
    /**
     * route guards.
     */
    guards?: Type<CanActive>[];
}

export interface ProtocolRouteMapingMetadata extends RouteMapingMetadata {
    /**
     * protocol type.
     */
    protocol?: string;
}

export interface MappingReflect extends TypeReflect {
    sortRoutes: DecorDefine[];
}

const emptyNext = async () => { };


const isRest = /\/:/;
const restParms = /^\S*:/;

/**
 * mapping request token.
 */
export const REQUEST = tokenId('REQUEST');
/**
 * mapping request params token.
 */
export const REQUEST_PARAMS = tokenId('REQUEST_PARAMS');

/**
 * mapping request body token.
 */
export const REQUEST_BODY = tokenId('REQUEST_BODY');

/**
 * mapping route.
 */
export class MappingRoute extends Route {

    constructor(info: RouteInfo, protected reflect: MappingReflect, protected injector: Injector, protected middlewares?: MiddlewareType[]) {
        super(info);
    }

    protected override async navigate(ctx: Context, next: () => Promise<void>): Promise<void> {
        const meta = ctx.activeRouteMetadata || this.getRouteMetaData(ctx)!;
        let middlewares = this.getRouteMiddleware(ctx, meta);
        if (middlewares.length) {
            const state = this.injector.state();
            await chain(middlewares.map(m => this.parseHandle(state, m)).filter(f => !!f), ctx)
        }
        await this.invoke(ctx, meta);
        return await next();
    }

    protected override async canActive(ctx: Context) {
        if (!await super.canActive(ctx)) return false;
        const meta = this.getRouteMetaData(ctx);
        if (!meta) return false;
        let rmeta = meta.metadata as RouteMapingMetadata;
        if (rmeta.guards && rmeta.guards.length) {
            if (!(await lang.some(
                rmeta.guards.map(token => () => this.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) {
                ctx.status = 403;
                return false;
            }
        }
        ctx.activeRouteMetadata = meta;
        return true;
    }

    async invoke(ctx: Context, meta: DecorDefine) {
        const injector = this.injector;
        if (meta && meta.propertyKey) {

            const ctrl = this.getInstance(ctx);
            if (!ctrl) {
                return;
            }

            let restParams: any = {};
            const route: string = meta.metadata.route;
            if (route && isRest.test(route)) {
                let routes = route.split('/').map(r => r.trim());
                let restParamNames = routes.filter(d => restParms.test(d));
                let baseURL = ctx.vaild.vaildify(this.url, true);
                let routeUrls = ctx.vaild.vaildify(ctx.url.replace(baseURL, '')).split('/');
                restParamNames.forEach(pname => {
                    let val = routeUrls[routes.indexOf(pname)];
                    restParams[pname.substring(1)] = val;
                });
            }
            ctx.restful = restParams;


            const factory = injector.resolve({ token: OperationInvokerFactory, target: this.reflect });
            // todo add module resolve
            const context = factory.createContext(this.reflect, meta.propertyKey, injector, {
                args: ctx,
                resolvers: createRequstResolvers
            });
            let result = factory.create(this.reflect, meta.propertyKey, ctrl).invoke(context);

            if (isPromise(result)) {
                result = await result;
            }
            if (isObservable(result)) {
                result = await result.toPromise();
            }

            // middleware.
            if (isFunction(result)) {
                await result(ctx);
            } else if (result instanceof Middleware) {
                await result.execute(ctx, emptyNext);
            } else if (!isNil(result)) {
                if (result instanceof ResultValue) {
                    return await result.sendValue(ctx);
                }

                const strategy = injector.resolve({ token: ResultStrategy, target: result });
                if (strategy) {
                    return await strategy.send(ctx, result);
                }

                ctx.body = result;
                ctx.status = 200;
            }
        }
    }

    protected getInstance(ctx: Context) {
        return this.injector.resolve(this.reflect.type, ctx.injector)
            ?? this.injector.state().resolve(this.reflect.type, [ctx.injector]);
    }

    protected getRouteMiddleware(ctx: Context, meta: DecorDefine) {
        return [...this.middlewares || [], ...(meta.metadata as RouteMapingMetadata).middlewares || []];
    }

    protected getRouteMetaData(ctx: Context) {
        const vaild = ctx.vaild;
        let subRoute = vaild.vaildify(vaild.getReqRoute(ctx, this.prefix).replace(this.url, ''), true);
        if (!this.reflect.sortRoutes) {
            this.reflect.sortRoutes = this.reflect.class.methodDecors
                .filter(m => m && isString(m.metadata.route))
                .sort((ra, rb) => (rb.metadata.route || '').length - (ra.metadata.route || '').length);

        }

        let allMethods = this.reflect.sortRoutes.filter(m => m && m.metadata.method === ctx.method);

        let meta = allMethods.find(d => vaild.vaildify(d.metadata.route || '', true) === subRoute);
        if (!meta) {
            meta = allMethods.find(route => {
                let uri = vaild.vaildify(route.metadata.route || '', true);
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

    protected parseHandle(state: RegisteredState, mdty: MiddlewareType): AsyncHandler<Context> {
        if (mdty instanceof Middleware) {
            return mdty.toHandle();
        } else if (isMiddlwareType(mdty)) {
            if (!state.isRegistered(mdty)) {
                this.injector.register(mdty);
            }
            const handle = this.injector.get(mdty) ?? state.getInstance(mdty);
            return handle?.toHandle?.();
        } else if (isFunction(mdty)) {
            return mdty;
        }
        return null!;
    }

}



export function createRequstResolvers(injector: Injector, typeRef?: TypeReflect, method?: string): OperationArgumentResolver[] {

    return [
        {
            canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
                const filed = parameter.filed ?? parameter.paramName;
                return args instanceof Context
                    && (isPrimitiveType(parameter.provider) || !!parameter.pipe)
                    && parameter.type == Array
                    && !!filed
                    && isArray(args.request.body[filed]);
            },
            resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
                if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
                const filed = parameter.filed ?? parameter.paramName;
                const value: any[] = args.request.body[filed];
                const pipeName = parameter.pipe ?? parameter.type.name.toLowerCase();
                const pipe = injector.get<PipeTransform>(pipeName);
                return value.map(val => pipe.transform(val, ...parameter.args || EMPTY));
            }
        },
        {
            canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
                return args instanceof Context
                    && parameter.scope === 'query'
                    && isPrimitiveType(parameter.type)
                    && injector.has(parameter.pipe ?? parameter.type!.name.toLowerCase(), true)
                    && !!parameter.paramName
                    && isDefined(args.query[parameter.paramName]);
            },
            resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
                if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
                const pipe = parameter.pipe ?? parameter.type.name.toLowerCase();
                return injector.get<PipeTransform>(pipe).transform(args.query[parameter.paramName], ...parameter.args || EMPTY)
            }
        },
        {
            canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
                return args instanceof Context
                    && parameter.scope === 'restful'
                    && isPrimitiveType(parameter.type)
                    && injector.has(parameter.pipe ?? parameter.type!.name.toLowerCase(), true)
                    && !!parameter.paramName
                    && isDefined(args.restful[parameter.paramName]);
            },
            resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
                if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
                const pipe = parameter.pipe ?? parameter.type.name.toLowerCase();
                return injector.get<PipeTransform>(pipe).transform(args.restful[parameter.paramName], ...parameter.args || EMPTY)
            }
        },
        {
            canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
                return args instanceof Context
                    && parameter.scope === 'body'
                    && isPrimitiveType(parameter.type)
                    && injector.has(parameter.pipe ?? parameter.type!.name.toLowerCase(), true)
                    && !!parameter.paramName
                    && isDefined(args.request.body[parameter.filed ?? parameter.paramName]);
            },
            resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
                if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
                const pipe = parameter.pipe ?? parameter.type.name.toLowerCase();
                return injector.get<PipeTransform>(pipe).transform(args.body[parameter.filed ?? parameter.paramName], ...parameter.args || EMPTY)
            }
        },
        {
            canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
                const filed = parameter.filed ?? parameter.paramName;
                return args instanceof Context
                    && !parameter.scope
                    && isPrimitiveType(parameter.type)
                    && injector.has(parameter.pipe ?? parameter.type!.name.toLowerCase(), true)
                    && !!filed
                    && isDefined(args.query[filed] || args.restful[filed] || args.request.body[filed]);
            },
            resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
                if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
                const pipe = parameter.pipe ?? parameter.type.name.toLowerCase();
                const field = parameter.filed ?? parameter.paramName;
                return injector.get<PipeTransform>(pipe).transform(args.query[field] || args.restful[field] || args.request.body[field], ...parameter.args || EMPTY)
            }
        },
        // {
        //     canResolve(parameter: Parameter & RequsetParameterMetadata, args) {
        //         return args instanceof Context && isClass(parameter.type)
        //             && (injector.has(parameter.type, true) || (!!parameter.pipe && injector.has(parameter.pipe, true)))
        //             && isDefined(parameter.filed ? args.request.body[parameter.filed] : args.request.body);
        //     },
        //     resolve(parameter: Parameter & RequsetParameterMetadata, args: Context) {
        //         if (!parameter.type || !parameter.paramName) throw new ArgumentError('paramter type and name is null');
        //         const value = parameter.filed ? args.request.body[parameter.filed] : args.request.body;
        //         if (parameter.pipe) {
        //             return injector.get<PipeTransform>(parameter.pipe).transform(value, ...parameter.args || EMPTY);
        //         }
        //         const model = injector.get(parameter.type);
        //     }
        // }
    ];
}

