import {
    AsyncHandler, DecorDefine, Type, TypeReflect, Injector, tokenId, RegisteredState,
    isPrimitiveType, isPromise, isString, isArray, isFunction, isNil, isDefined, isClass, lang,
    chain, isObservable, composeResolver, OperationArgumentResolver, Parameter, EMPTY, ClassType
} from '@tsdi/ioc';
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

            let restParams: any = {};
            const route: string = meta.metadata.route;
            if (route && isRest.test(route)) {
                let routes = route.split('/').map(r => r.trim());
                let restParamNames = routes.filter(d => restParms.test(d));
                let baseURL = ctx.vaild.vaildify(this.url, true);
                let routeUrls = ctx.vaild.vaildify(ctx.url.replace(baseURL, '')).split('/');
                restParamNames.forEach(pname => {
                    let val = routeUrls[routes.indexOf(pname)];
                    if (val) {
                        restParams[pname.substring(1)] = val;
                    }
                });
            }
            ctx.restful = restParams;

            let result = injector.invoke(this.reflect, meta.propertyKey, {
                args: ctx,
                resolvers: createRequstResolvers
            });

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

export function missingPipeError(parameter: Parameter, type?: ClassType, method?: string) {
    return new ArgumentError(`missing pipe to transform argument ${parameter.paramName} type, method ${method} of class ${type}`);
}

/**
 * trasport parameter.
 */
export interface TrasportParameter<T = any> extends Parameter<T> {
    /**
     * field scope.
     */
    scope?: 'body' | 'query' | 'restful'
    /**
     * field of request query params or body.
     */
    field?: string;
    /**
     * pipe
     */
    pipe?: string | Type<PipeTransform>;
    /**
     * pipe extends args
     */
    args?: any[];
}

export interface RequsetArgumentResolver<T extends TrasportParameter = TrasportParameter> extends OperationArgumentResolver<T> {
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param args gave arguments
     */
    resolve(parameter: T, args: Record<string, any>): any;
}

export const MODEL_RESOLVERS = tokenId<RequsetArgumentResolver[]>('MODEL_RESOLVERS');

export function createRequstResolvers(injector: Injector, typeRef?: TypeReflect, method?: string): RequsetArgumentResolver[] {

    return [
        composeResolver<TrasportParameter>(
            (parameter, args) => args instanceof Context && isDefined(parameter.field ?? parameter.paramName),
            composeResolver<TrasportParameter>(
                (parameter, args) => isPrimitiveType(parameter.type),
                {
                    canResolve(parameter, args: Context) {
                        return parameter.scope === 'query' && isDefined(args.query[parameter.field ?? parameter.paramName]);
                    },
                    resolve(parameter, args: Context) {
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return pipe.transform(args.query[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                    }
                },
                {
                    canResolve(parameter, args: Context) {
                        return parameter.scope === 'restful' && isDefined(args.restful[parameter.field ?? parameter.paramName]);
                    },
                    resolve(parameter, args: Context) {
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return pipe.transform(args.restful[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                    }
                },
                {
                    canResolve(parameter, args: Context) {
                        return parameter.scope === 'body' && isDefined(args.request.body[parameter.field ?? parameter.paramName]);
                    },
                    resolve(parameter, args: Context) {
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return pipe.transform(args.request.body[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                    }
                },
                {
                    canResolve(parameter, args: Context) {
                        const field = parameter.field ?? parameter.paramName;
                        return !parameter.scope && isDefined(args.query[field] ?? args.restful[field] ?? args.request.body[field])
                    },
                    resolve(parameter, args: Context) {
                        const field = parameter.field ?? parameter.paramName;
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return pipe.transform(args.query[field] ?? args.restful[field] ?? args.request.body[field], ...parameter.args || EMPTY)
                    }
                }
            ),
            composeResolver<TrasportParameter>(
                (parameter, args) => isPrimitiveType(parameter.provider) && parameter.type == Array,
                {
                    canResolve(parameter, args: Context) {
                        const field = parameter.field ?? parameter.paramName;
                        return parameter.scope === 'query' && (isArray(args.request.query[field]) || isString(args.request.query[field]));
                    },
                    resolve(parameter, args: Context) {
                        const value = args.request.body[parameter.field ?? parameter.paramName];
                        const values: any[] = isString(value) ? value.split(',') : value;
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return values.map(val => pipe.transform(val, ...parameter.args || EMPTY));
                    }
                },
                {
                    canResolve(parameter, args: Context) {
                        return parameter.scope === 'restful' && isDefined(args.restful[parameter.field ?? parameter.paramName]);
                    },
                    resolve(parameter, args: Context) {
                        const value = (args.restful[parameter.field ?? parameter.paramName] as string).split(',');
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return value.map(val => pipe.transform(val, ...parameter.args || EMPTY));
                    }
                },
                {
                    canResolve(parameter, args: Context) {
                        return isArray(args.request.body[parameter.field ?? parameter.paramName]);
                    },
                    resolve(parameter, args: Context) {
                        const value: any[] = args.request.body[parameter.field ?? parameter.paramName];
                        const pipe = injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return value.map(val => pipe.transform(val, ...parameter.args || EMPTY));
                    }
                }
            ),
            composeResolver<TrasportParameter>(
                (parameter, args) => parameter.scope === 'body'
                    && (parameter.field ? args.request.body[parameter.field] : Object.keys(args.request.body).length > 0)
                    && (isClass(parameter.type) || isClass(parameter.provider)),
                {
                    canResolve(parameter, args: Context) {
                        return isDefined(parameter.pipe);
                    },
                    resolve(parameter, args: Context) {
                        const value = parameter.field ? args.request.body[parameter.field] : args.request.body;
                        const pipe = injector.get<PipeTransform>(parameter.pipe!);
                        if (!pipe) throw missingPipeError(parameter, typeRef?.type, method);
                        return pipe.transform(value, ...parameter.args || EMPTY);
                    }
                },
                ...injector.get(MODEL_RESOLVERS) ?? EMPTY
            )
        ),
    ]
}

