import { Abstract, AsyncHandler, ClassType, DecorDefine, isArray, isClass, isFunction, isNullOrUndefined, isObject, isPrimitiveType, isPromise, isString, isUndefined, lang, ParameterMetadata, ProviderType, tokenId, Type, TypeReflect } from '@tsdi/ioc';
import { BUILDER, TYPE_PARSER } from '../tk';
import { MsgContext } from './ctx';
import { Middleware, MiddlewareType } from './handle';
import { DefaultModelParserToken, ModelParser } from './ModelParser';
import { MessageRoute } from './route';
import { MessageRouter } from './router';


export interface RouteMapingMetadata {
    /**
     * route.
     *
     * @type {string}
     * @memberof RouteMetadata
     */
    route?: string;

    parent?: Type<MessageRouter>;

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
    abstract getMiddlewares(ctx: MsgContext, reflect: MappingReflect, propertyKey?: string): MiddlewareType[];
}

export const MSG_CONTEXT = tokenId<MsgContext>('MSG_CONTEXT')


const isRest = /\/:/;
const restParms = /^\S*:/;


export class MappingRoute extends MessageRoute {

    constructor(url: string, parentRoute: string, private reflect: MappingReflect, private factory: (...prds) => any, private middlewares: MiddlewareType[]) {
        super(url, parentRoute);
    }

    protected async navigate(ctx: MsgContext, next: () => Promise<void>): Promise<void> {
        let meta = this.getRouteMetaData(ctx);
        if (!meta) {
            return await next();
        }
        let middlewares = this.getRouteMiddleware(ctx, meta);
        if (middlewares.length) {
            await this.execFuncs(ctx, middlewares.map(m => this.toHandle(ctx.injector, m)).filter(f => !!f))
        }
        await this.invoke(ctx, meta);
        return await next();
    }

    async invoke(ctx: MsgContext, meta: DecorDefine) {
        let injector = ctx.injector;
        if (meta && meta.propertyKey) {
            let ctrl = this.factory({ provide: MSG_CONTEXT, useValue: ctx });
            let providers = await this.createProvider(ctx, ctrl, meta.matedata, this.reflect.methodParams.get(meta.propertyKey));
            let result = await injector.invoke(ctrl, meta.propertyKey, ...providers);
            if (isPromise(result)) {
                result = await result;
            }

            // middleware.
            if (isFunction(result)) {
                await result(ctx);
            } else if (result instanceof Middleware) {
                await result.execute(ctx, emptyNext);
            } else if (isPrimitiveType(result)) {
                // if (isBuffer(result)) {
                //     if (typeof Buffer !== 'undefined') {
                //         ctx.body = Buffer.from(result)
                //     } else {
                //         ctx.body = result;
                //     }
                // } else {
                ctx.body = result;
                // }
                ctx.status = 200;
            } else if (isObject(result)) {
                // if (result instanceof ResultValue) {
                //     await result.sendValue(ctx);
                // } else {
                ctx.body = result;
                ctx.status = 200;
                // }
            } else {
                ctx.body = result;
                ctx.status = 200;
            }
        }
    }

    protected getRouteMiddleware(ctx: MsgContext, meta: DecorDefine) {
        let vailds = ctx.injector.getServices(RouteMappingVaildator);
        let middlewares = this.middlewares || [];
        if (vailds && vailds.length) {
            middlewares = vailds.map(auth => auth.getMiddlewares(ctx, this.reflect)).reduce((p, c) => p.concat(c), [])
                .concat(middlewares)
                .concat(vailds.map(a => a.getMiddlewares(ctx, this.reflect, meta.propertyKey)).reduce((p, c) => p.concat(c), []));
        }
        if ((meta.matedata as RouteMapingMetadata).middlewares) {
            middlewares = middlewares.concat((meta.matedata as RouteMapingMetadata).middlewares);
        }
        return middlewares;
    }

    protected getRouteMetaData(ctx: MsgContext) {
        const vaild = ctx.vaild;
        let subRoute = vaild.vaildify(vaild.getReqRoute(ctx, this.parentRoute).replace(this.url, ''), true);
        if (!this.reflect.sortRoutes) {
            this.reflect.sortRoutes = this.reflect.class.methodDecors
                .filter(m => m && isString(m.matedata.route))
                .sort((ra, rb) => (rb.matedata.route || '').length - (ra.matedata.route || '').length);

        }

        let allMethods = this.reflect.sortRoutes.filter(m => m && m.matedata.method === ctx.method);

        let meta = allMethods.find(d => vaild.vaildify(d.matedata.route || '', true) === subRoute);
        if (!meta) {
            meta = allMethods.find(route => {
                let uri = vaild.vaildify(route.matedata.route || '', true);
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

    protected async createProvider(ctx: MsgContext, ctrl: any, meta: RouteMapingMetadata, params: ParameterMetadata[]): Promise<ProviderType[]> {
        const { injector, vaild } = ctx;
        let providers: ProviderType[] = [{ provide: MSG_CONTEXT, useValue: ctx }];
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
                let ptype = param.provider ? injector.getTokenProvider(param.provider) : param.type;
                let val;
                if (isFunction(ptype)) {
                    if (isPrimitiveType(ptype)) {
                        let paramVal = restParams[param.paramName];
                        if (isUndefined(paramVal)) {
                            paramVal = ctx.request.query[param.paramName];
                        }
                        val = parser.parse(ptype, paramVal);
                    }
                    if (isNullOrUndefined(val) && Object.keys(body).length) {
                        if (isArray(ptype) && isArray(body)) {
                            val = body;
                        } else if (isPrimitiveType(ptype)) {
                            val = parser.parse(ptype, body[param.paramName]);
                        } else if (isClass(ptype)) {
                            let mdparser = injector.getService({ token: ModelParser, target: ptype, defaultToken: DefaultModelParserToken });
                            if (mdparser) {
                                val = mdparser.parseModel(ptype, body);
                            } else {
                                val = await injector.getInstance(BUILDER).resolve({ type: ptype, template: body })
                            }
                        }
                    }
                }

                if (isNullOrUndefined(val)) {
                    return null;
                }
                return { provide: param.paramName || ptype, useValue: val };
            }))
            providers = providers.concat(ppds.filter(p => p !== null));
        }

        return providers;
    }

    protected toHandle(injector, handleType: MiddlewareType): AsyncHandler<MsgContext> {
        if (handleType instanceof Middleware) {
            return handleType.toAction();
        } else if (lang.isBaseOf(handleType, Middleware)) {
            const handle = injector.get(handleType) ?? injector.getContainer().regedState.getInjector(handleType as ClassType)?.get(handleType);
            return handle?.toAction?.();
        } else if (isFunction(handleType)) {
            return handleType as AsyncHandler<MsgContext>;
        }
        return null;
    }

}