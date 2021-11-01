import {
    AsyncHandler, DecorDefine, Type, TypeReflect, Injector, RegisteredState,
    isPrimitiveType, isPromise, isString, isArray, isFunction, isDefined, lang,
    chain, isObservable, composeResolver, Parameter, EMPTY, ClassType
} from '@tsdi/ioc';
import { MODEL_RESOLVERS } from '../model/resolver';
import { ArgumentError, PipeTransform } from '../pipes/pipe';
import { Context } from './context';
import { CanActive } from './guard';
import { AbstractRouter, isMiddlwareType, isMiddlware, MiddlewareType, RouteInfo } from './middleware';
import { TrasportArgumentResolver, TrasportParameter } from './resolver';
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

    parent?: Type<AbstractRouter>;

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
                resolvers: [
                    ...primitiveResolvers,
                    ...injector.get(MODEL_RESOLVERS) ?? EMPTY
                ]
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
            } else if (isMiddlware(result)) {
                await result.execute(ctx, emptyNext);
            } else {
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
        if (isMiddlware(mdty)) {
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

const primitiveResolvers: TrasportArgumentResolver[] = [
    composeResolver<TrasportArgumentResolver, TrasportParameter>(
        (parameter, ctx) => ctx.arguments instanceof Context && isDefined(parameter.field ?? parameter.paramName),
        composeResolver<TrasportArgumentResolver>(
            (parameter, ctx) => isPrimitiveType(parameter.type),
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'query' && isDefined(ctx.arguments.query[parameter.field ?? parameter.paramName]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.query[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.arguments.restful[parameter.field ?? parameter.paramName]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.restful[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.arguments.request.body[parameter.field ?? parameter.paramName]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.request.body[parameter.field ?? parameter.paramName], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName;
                    const args = ctx.arguments;
                    return !parameter.scope && isDefined(args.query[field] ?? args.restful[field] ?? args.request.body[field])
                },
                resolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName;
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? parameter.type.name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    const args = ctx.arguments;
                    return pipe.transform(args.query[field] ?? args.restful[field] ?? args.request.body[field], ...parameter.args || EMPTY)
                }
            }
        ),
        composeResolver<TrasportArgumentResolver, TrasportParameter>(
            (parameter) => isPrimitiveType(parameter.provider) && (parameter.mutil === true || parameter.type === Array),
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName;
                    return parameter.scope === 'query' && (isArray(ctx.arguments.request.query[field]) || isString(ctx.arguments.request.query[field]));
                },
                resolve(parameter, ctx) {
                    const value = ctx.arguments.request.body[parameter.field ?? parameter.paramName];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.arguments.restful[parameter.field ?? parameter.paramName]);
                },
                resolve(parameter, ctx) {
                    const value = (ctx.arguments.restful[parameter.field ?? parameter.paramName] as string).split(',');
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return isArray(ctx.arguments.request.body[parameter.field ?? parameter.paramName]);
                },
                resolve(parameter, ctx) {
                    const value: any[] = ctx.arguments.request.body[parameter.field ?? parameter.paramName];
                    const pipe = ctx.injector.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;;
                }
            }
        ),
        {

            canResolve(parameter, ctx) {
                return isDefined(parameter.pipe) && parameter.scope === 'body'
                    && (parameter.field ? ctx.arguments.request.body[parameter.field] : Object.keys(ctx.arguments.request.body).length > 0);
            },
            resolve(parameter, ctx) {
                const value = parameter.field ? ctx.arguments.request.body[parameter.field] : ctx.arguments.request.body;
                const pipe = ctx.injector.get<PipeTransform>(parameter.pipe!);
                if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                return pipe.transform(value, ...parameter.args || EMPTY);
            }
        }
    )
]

