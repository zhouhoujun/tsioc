import {
    Abstract, AsyncHandler, DecorDefine, lang, ParameterMetadata, ProviderType, Type, TypeReflect, IInjector,
    isPrimitiveType, isPromise, isString, isUndefined, isArray, isClass, isFunction, isNil, isPlainObject, tokenId, RegisteredState
} from '@tsdi/ioc';
import { CONTEXT, TYPE_PARSER } from '../metadata/tk';
import { MessageContext } from './ctx';
import { IRouter, Middleware, MiddlewareType } from './handle';
import { DefaultModelParserToken, ModelParser } from './ModelParser';
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

    method?: string;

    /**
     * http content type.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    contentType?: string;
    /**
     * middlewares
     *
     * @type {MiddlewareType[]}
     * @memberof RouteMetadata
     */
    middlewares?: MiddlewareType[]
}

export interface MappingReflect extends TypeReflect {
    sortRoutes: DecorDefine[];
}

const emptyNext = async () => { };


@Abstract()
export abstract class RouteMappingVaildator {
    abstract getMiddlewares(ctx: MessageContext, reflect: MappingReflect, propertyKey?: string): MiddlewareType[];
}


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

    constructor(url: string, prefix: string, protected reflect: MappingReflect, protected injector: IInjector, protected middlewares: MiddlewareType[]) {
        super(url, prefix);
    }

    protected async navigate(ctx: MessageContext, next: () => Promise<void>): Promise<void> {
        let meta = this.getRouteMetaData(ctx);
        if (!meta) {
            return await next();
        }
        let middlewares = this.getRouteMiddleware(ctx, meta);
        if (middlewares.length) {
            const state = this.injector.state();
            await this.execHandler(ctx, middlewares.map(m => this.parseHandle(state, m)).filter(f => !!f))
        }
        await this.invoke(ctx, meta);
        return await next();
    }

    
    async invoke(ctx: MessageContext, meta: DecorDefine) {
        const injector = this.injector;
        if (meta && meta.propertyKey) {
            const ctrl = this.getInstance(ctx);
            if (!ctrl) {
                return;
            }
            const providers = await this.createProvider(ctx, ctrl, meta.metadata, this.reflect.methodParams.get(meta.propertyKey));

            let result = injector.invoke(ctrl, meta.propertyKey, ctx.providers, ...providers);
            if (isPromise(result)) {
                result = await result;
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

    protected getInstance(ctx: MessageContext) {
        return this.injector.resolve(this.reflect.type, ctx.providers, { provide: CONTEXT, useValue: ctx })
            ?? this.injector.state().resolve(this.reflect.type, ctx.providers, { provide: CONTEXT, useValue: ctx });
    }

    protected getRouteMiddleware(ctx: MessageContext, meta: DecorDefine) {
        let vailds = this.injector.getServices(RouteMappingVaildator);
        let middlewares = this.middlewares || [];
        if (vailds && vailds.length) {
            middlewares = vailds.map(auth => auth.getMiddlewares(ctx, this.reflect)).reduce((p, c) => p.concat(c), [])
                .concat(middlewares)
                .concat(vailds.map(a => a.getMiddlewares(ctx, this.reflect, meta.propertyKey)).reduce((p, c) => p.concat(c), []));
        }
        if ((meta.metadata as RouteMapingMetadata).middlewares) {
            middlewares = middlewares.concat((meta.metadata as RouteMapingMetadata).middlewares);
        }
        return middlewares;
    }

    protected getRouteMetaData(ctx: MessageContext) {
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

    protected async createProvider(ctx: MessageContext, ctrl: any, meta: RouteMapingMetadata, params: ParameterMetadata[]): Promise<ProviderType[]> {
        const vaild = ctx.vaild;
        const injector = this.injector;
        let providers: ProviderType[] = [{ provide: CONTEXT, useValue: ctx }];
        if (params && params.length) {
            let restParams: any = {};
            if (isRest.test(meta.route)) {
                let routes = meta.route.split('/').map(r => r.trim());
                let restParamNames = routes.filter(d => restParms.test(d));
                let baseURL = vaild.vaildify(this.url, true);
                let routeUrls = vaild.vaildify(ctx.url.replace(baseURL, '')).split('/');
                restParamNames.forEach(pname => {
                    let val = routeUrls[routes.indexOf(pname)];
                    restParams[pname.substring(1)] = val;
                });
            }
            let body = ctx.request?.body || {};
            let parser = injector.get(TYPE_PARSER);
            let ppds: ProviderType[] = await Promise.all(params.map(async (param) => {
                let ptype = param.isProviderType ? param.provider : param.type;
                let val;
                if (isFunction(ptype)) {
                    if (isPrimitiveType(ptype)) {
                        let paramVal = restParams[param.paramName];
                        if (isUndefined(paramVal)) {
                            paramVal = ctx.request.query[param.paramName];
                        }
                        val = parser.parse(ptype, paramVal);
                    }
                    const keys = Object.keys(body);
                    if (isNil(val) && keys.length) {
                        if (isArray(ptype) && isArray(body)) {
                            val = body;
                        } else if (isPrimitiveType(ptype)) {
                            val = parser.parse(ptype, body[param.paramName]);
                        } else if (isClass(ptype)) {
                            if (body instanceof ptype) {
                                val = body;
                            } else {
                                let rkey: string;
                                if (isPlainObject(body)) {
                                    rkey = keys.find(k => body[k] instanceof (ptype as Type));
                                }

                                if (rkey) {
                                    val = body[rkey];
                                } else {
                                    let mdparser = injector.resolve({ token: ModelParser, target: ptype, defaultToken: DefaultModelParserToken });
                                    if (mdparser) {
                                        val = mdparser.parseModel(ptype, body);
                                    } else {
                                        // val = await injector.getInstance(BUILDER).build({ type: ptype, template: body })
                                    }
                                }
                            }
                        }
                    }
                } else if (ptype === REQUEST) {
                    val = ctx.request;
                } else if (ptype === REQUEST_PARAMS) {
                    val = ctx.request.query ?? {};
                } else if (ptype === REQUEST_BODY) {
                    val = body;
                }

                if (isNil(val)) {
                    return null;
                }
                return { provide: param.paramName || ptype, useValue: val };
            }))
            providers = providers.concat(ppds.filter(p => p !== null));
        }

        return providers;
    }

    protected parseHandle(state: RegisteredState, mdty: MiddlewareType): AsyncHandler<MessageContext> {
        if (mdty instanceof Middleware) {
            return mdty.toHandle();
        } else if (lang.isBaseOf(mdty, Middleware)) {
            if (!state.isRegistered(mdty)) {
                this.injector.register(mdty);
            }
            const handle = this.injector.get(mdty) ?? state.getInstance(mdty);
            return handle?.toHandle?.();
        } else if (isFunction(mdty)) {
            return mdty;
        }
        return null;
    }

}
