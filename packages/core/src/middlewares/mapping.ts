import {
    AsyncHandler, DecorDefine, Type, TypeReflect, Injector, lang, chain,
    isPrimitiveType, isPromise, isString, isArray, isFunction, isDefined,
    composeResolver, Parameter, EMPTY, ClassType, ArgumentError, InvocationContext,
    OperationRef, ObservableParser, OnDestroy, OperationFactory, DefaultTypeRef, isClass
} from '@tsdi/ioc';
import { isObservable } from 'rxjs';
import { Middleware } from './middleware';
import { MODEL_RESOLVERS } from '../model/resolver';
import { PipeTransform } from '../pipes/pipe';
import { Context } from './context';
import { CanActive } from './guard';
import { MiddlewareType } from './middlewares';
import { TrasportArgumentResolver, TrasportParameter } from './resolver';
import { ResultValue } from './result';
import { Route } from './route';
import { ProtocolRouteMappingMetadata, RouteMappingMetadata, Router } from './router';

const emptyNext = async () => { };


const isRest = /\/:/;
const restParms = /^\S*:/;



/**
 * route mapping ref.
 */
export class RouteMappingRef<T> extends DefaultTypeRef<T> implements Route, OnDestroy {

    private metadata: ProtocolRouteMappingMetadata;
    protected sortRoutes: DecorDefine[] | undefined;

    constructor(factory: OperationFactory<T>, injector: Injector, root: InvocationContext, instance?: T) {
        super(factory, injector, root, instance);
        this.metadata = factory.targetReflect.annotation as ProtocolRouteMappingMetadata;
    }

    get url(): string {
        return this.metadata.route ?? '';
    }

    get guards(): Type<CanActive>[] | undefined {
        return this.metadata.guards;
    }

    private _protocols!: string[];
    get protocols(): string[] {
        if (!this._protocols) {
            this._protocols = this.metadata.protocol?.split(';') ?? EMPTY;
        }
        return this._protocols;
    }

    async handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        const method = await this.getRoute(ctx);
        if (method) {
            let middlewares = this.getRouteMiddleware(ctx, method);
            if (middlewares.length) {
                await chain(middlewares.map(m => this.parseHandle(m)!).filter(f => !!f), ctx)
            }
            return await this.response(ctx, method);
        } else {
            return await next();
        }
    }

    protected async getRoute(ctx: Context) {
        if (!((!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url) === true)) return null;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return null;
        }
        const meta = this.getRouteMetaData(ctx);
        if (!meta) return null;
        let rmeta = meta.metadata as RouteMappingMetadata;
        if (rmeta.guards && rmeta.guards.length) {
            if (!(await lang.some(
                rmeta.guards.map(token => () => this.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) {
                ctx.status = 403;
                return null;
            }
        }
        return meta;
    }

    async response(ctx: Context, meta: DecorDefine) {
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
            let result = this.invoke(meta.propertyKey, {
                arguments: ctx,
                resolvers: [
                    ...primitiveResolvers,
                    ...injector.get(MODEL_RESOLVERS) ?? EMPTY,
                ]
            });


            if (isPromise(result)) {
                result = await result;
            } else if (isObservable(result)) {
                const parser = injector.get(ObservableParser);
                if (!parser) throw Error('has not register ObservableParser provider. can not support return Observable in route mapping.');
                result = await parser.toPromise(result);
            }

            // middleware.
            if (isFunction(result)) {
                await result(ctx);
            } else if (result instanceof ResultValue) {
                return await result.sendValue(ctx);
            } else if (isDefined(result)) {
                ctx.body = result;
            } else {
                ctx.status = 200;
            }

        }
    }

    protected getRouteMiddleware(ctx: Context, meta: DecorDefine) {
        return [...this.reflect.annotation?.middlewares || EMPTY, ...(meta.metadata as RouteMappingMetadata).middlewares || EMPTY];
    }

    protected getRouteMetaData(ctx: Context) {
        const vaild = ctx.vaild;
        let subRoute = vaild.vaildify(vaild.getReqRoute(ctx).replace(this.url, ''), true);
        if (!this.sortRoutes) {
            this.sortRoutes = this.reflect.class.methodDecors
                .filter(m => m && isString(m.metadata.route))
                .sort((ra, rb) => (rb.metadata.route || '').length - (ra.metadata.route || '').length);

        }

        let allMethods = this.sortRoutes.filter(m => m && m.metadata.method === ctx.method);

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

    protected parseHandle(mdty: MiddlewareType | Type<Middleware>): AsyncHandler<Context> | undefined {
        if (isClass(mdty)) {
            return this.injector.get(mdty);
        }
        if (mdty instanceof OperationRef) {
            return mdty.instance;
        } else {
            return mdty;
        }
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
                    return parameter.scope === 'query' && isDefined(ctx.arguments.query[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.query[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.arguments.restful[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.restful[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'body' && isDefined(ctx.arguments.request.body[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return pipe.transform(ctx.arguments.request.body[parameter.field ?? parameter.paramName!], ...parameter.args || EMPTY)
                }
            },
            {
                canResolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    const args = ctx.arguments;
                    return !parameter.scope && isDefined(args.query[field] ?? args.restful[field] ?? args.request.body[field])
                },
                resolve(parameter, ctx) {
                    const field = parameter.field ?? parameter.paramName!;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? parameter.type?.name.toLowerCase()!);
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
                    const field = parameter.field ?? parameter.paramName!;
                    return parameter.scope === 'query' && (isArray(ctx.arguments.request.query[field]) || isString(ctx.arguments.request.query[field]));
                },
                resolve(parameter, ctx) {
                    const value = ctx.arguments.request.body[parameter.field ?? parameter.paramName!];
                    const values: any[] = isString(value) ? value.split(',') : value;
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return values.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return parameter.scope === 'restful' && isDefined(ctx.arguments.restful[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const value = (ctx.arguments.restful[parameter.field ?? parameter.paramName!] as string).split(',');
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
                    if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
                    return value.map(val => pipe.transform(val, ...parameter.args || EMPTY)) as any;
                }
            },
            {
                canResolve(parameter, ctx) {
                    return isArray(ctx.arguments.request.body[parameter.field ?? parameter.paramName!]);
                },
                resolve(parameter, ctx) {
                    const value: any[] = ctx.arguments.request.body[parameter.field ?? parameter.paramName!];
                    const pipe = ctx.get<PipeTransform>(parameter.pipe ?? (parameter.provider as Type).name.toLowerCase());
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
                const pipe = ctx.get<PipeTransform>(parameter.pipe!);
                if (!pipe) throw missingPipeError(parameter, ctx.target, ctx.method);
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

