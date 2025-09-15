import {
    isFunction, lang, Platform, ctorName, InvocationContext, HandlerScope, HandlerFn,
    Context, ContextToken, invokeTail, RuntimeContext, InterceptorLike, isDefined,
    ParameterMetadata, ClassRef, proxyTag, isObject, isNil, object2string, getClassify,
    composeHandlers, composeInterceptors
} from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';
import { Advicer } from '../Advicer';
import { AroundMetadata } from '../metadata/meta';


/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope implements Proceeding {
    constructor(
        readonly platform: Platform
    ) { }


    pointcutCtor(ctx: RuntimeContext, next: HandlerFn, context: Context) {
        const advisor = context.get(Advisor);
        if (!advisor.hasCtor(ctx.classRef)) {
            return invokeTail(() => next(ctx, context), () => {
                if (advisor.hasPointcut(ctx.instance, ctx.classRef, true)) {
                    ctx.hasPointcut = true;
                    ctx.isNewContext = false;
                }
            });
        }

        ctx.isNewContext = false;
        return this.handle(ctx.classRef, `${ctx.classRef.className}.${ctorName}`, ctorName, null, advisor, ctx.platform, {
            parent: ctx.context,
            args: ctx.args,
            params: ctx.params,
            originProxy: (joinPoint) => {
                invokeTail(() => next(ctx, context), () => {
                    const instance = joinPoint.returning = joinPoint.target = ctx.instance;
                    return instance;
                })
            },
        })

    }

    pointcutProperty(ctx: RuntimeContext, next: HandlerFn, context: Context) {
        return invokeTail(() => next(ctx, context), () => {
            const advisor = context.get(Advisor);
            if (isDefined(ctx.instance) && (ctx.hasPointcut || advisor.hasPointcut(ctx.instance, ctx.classRef, true))) {
                ctx.instance = this.createProxy(ctx.classRef.className, ctx.classRef, ctx.instance, ctx.classRef, ctx.instance, advisor, ctx.context)
            }
        });
    }

    protected createProxy(prefix: string, rootRef: ClassRef, root: any, typeRef: ClassRef | null, instance: any, advisor: Advisor, parent?: InvocationContext) {
        const descriptors = typeRef?.getPropertyDescriptors();

        const weekMap = new WeakMap();
        const proxy: any = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ctorName || name === proxyTag) return Reflect.get(target, name, receiver);
                const fullName = `${prefix}.${name.toString()}`;

                if (advisor.match(name, fullName, rootRef, root, { way: 'host' })) {
                    const result = Reflect.get(target, name, receiver);
                    if (!isObject(result)) {
                        return result;
                    }
                    let vpxy = weekMap.get(result);
                    if (!vpxy) {
                        vpxy = this.createProxy(fullName, rootRef, root, getClassify(result), result, advisor, parent);
                        weekMap.set(result, vpxy);
                    }
                    return vpxy;
                }

                const descriptor = descriptors?.[name];
                if (isFunction(descriptor?.value)) {
                    const result = Reflect.get(target, name, receiver);
                    let cachedFn = weekMap.get(result);
                    if (!cachedFn) {
                        if (advisor.match(name, fullName, rootRef, instance)) {
                            cachedFn = this.proxy(result, name, fullName, advisor, receiver ?? proxy, root, rootRef, parent);
                        } else {
                            cachedFn = result;
                        }
                        weekMap.set(result, cachedFn);
                    }
                    return cachedFn;
                }

                if (!advisor.match(name, fullName, rootRef, instance, { accessor: 'get' })) {
                    return Reflect.get(target, name, receiver);
                }

                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, this.platform, {
                    target: root,
                    parent,
                    args: [],
                    accessor: 'get',
                    originProxy: (j) => {
                        const value = Reflect.get(target, name, receiver);
                        return { value }
                    },
                    next: (j) => j.returning.value
                });

            },
            set: (target, name, newValue, receiver) => {
                if (name === ctorName || name === proxyTag) return Reflect.set(target, name, receiver);
                const fullName = `${prefix}.${name.toString()}`;

                if (!advisor.match(name, fullName, rootRef, instance, { accessor: 'set' })) {
                    return Reflect.set(target, name, newValue, receiver);
                }

                const oldValue = Reflect.get(target, name, receiver);
                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, this.platform, {
                    target: root,
                    parent,
                    args: [],
                    accessor: 'set',
                    valueChange: { newValue, oldValue },
                    originProxy: (j) => {
                        return Reflect.set(target, name, newValue, receiver);
                    }
                });
            }
        });

        proxy[proxyTag] = true;
        return proxy;
    }

    protected proxy<T>(originMethod: Function, propertyKey: string | symbol, fullName: string, advisor: Advisor, receiver: T, target: any, targetRef: ClassRef, parent?: InvocationContext) {
        const platform = this.platform;
        return (...args: any[]) => {
            if (!platform || !platform.injector || platform.injector.destroyed) {
                return originMethod.call(target, ...args)
            }
            const larg = lang.last(args);
            if (target[proxyTag] && larg instanceof InvocationContext) {
                args = args.slice(0, args.length - 1);
                parent = larg
            }
            return this.handle(targetRef, fullName, propertyKey, receiver, advisor, platform, {
                target,
                originMethod,
                args,
                parent
            })
        }
    }

    private handle(targetRef: ClassRef, fullName: string, propertyKey: string | symbol, receiver: any, advisor: Advisor, platform: Platform, options: {
        target?: any,
        originMethod?: Function,
        args?: any[];
        accessor?: 'get' | 'set';
        params?: ParameterMetadata[];
        valueChange?: { newValue: any, oldValue: any },
        parent?: InvocationContext,
        originProxy?: (joinPoint: JoinPoint) => any,
        next?: (res: JoinPoint) => any
    } = {}): any {
        if (!options.params) {
            options.params = targetRef?.getParameters(propertyKey);
        }
        const joinPoint = JoinPoint.create(options.parent?.injector ?? platform.getInjector('root') ?? platform.getInjector('platform'), {
            ...options,
            receiver,
            targetRef,
            targetType: targetRef?.type,
            propertyKey,
            fullName,
            advisor,
            annotations: targetRef?.getMethodDefines(propertyKey) //?? targetRef?.getPropDefines(propertyKey) //.defines.filter(d => d.propertyKey === propertyKey),
        });
        if (options.parent) {
            joinPoint.onDestroy(options.parent)
        }

        return getAdvicesLifeScope(platform).handle(joinPoint, platform.context, options.next ?? (() => joinPoint.returning));
    }

}



const ADVICES_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getAdvicesLifeScope(platform: Platform): HandlerScope<JoinPoint> {
    let scope = platform.context.get(ADVICES_SCOPE);
    if (!scope) {
        scope = new HandlerScope<JoinPoint>(platform, adviceHanlder, ADVICES_INTERCEPTORS);
        platform.context.set(ADVICES_SCOPE, scope);
    }
    return scope;
}



export const afterReturningIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), (res) => {
        ctx.state = JoinpointState.AfterReturning;
        if (isDefined(res) && res !== ctx) ctx.returning = res;
        const advicers = ctx.advisor.getAfterReturning(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target, { accessor: ctx.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(ctx, context);
        }
    })
}

export const afterThrowingInterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), {
        error: (error) => {
            ctx.throwing = error;
            ctx.state = JoinpointState.AfterThrowing;
            const advicers = ctx.advisor.getAfterThrowing(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target, { accessor: ctx.accessor });
            if (advicers?.length) {
                return toHanlder(advicers)(ctx, context);
            }
        },
    });
}

export const beforeIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => {
        ctx.state = JoinpointState.Before;
        const advicers = ctx.advisor.getBefore(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target, { accessor: ctx.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(ctx, context);
        }
    }, () => next(ctx, context));
}

export const pointcutIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => {
        ctx.state = JoinpointState.Pointcut;
        const advicers = ctx.advisor.getPointcut(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target, { accessor: ctx.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(ctx, context);
        }
    }, () => next(ctx, context));
}

export const afterIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), (res) => {
        ctx.state = JoinpointState.After;
        if (isDefined(res) && res !== ctx) ctx.returning = res;
        const advicers = ctx.advisor.getAfter(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target, { accessor: ctx.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(ctx, context);
        }
    });
}



export const originMethodHandler = (ctx: JoinPoint, context: Context) => {
    if (ctx.originProxy) {
        ctx.returning = ctx.originProxy(ctx)
    } else {
        ctx.returning = ctx.originMethod?.apply(ctx.receiver ?? ctx.target, ctx.args)
    }
    return ctx.returning;
}

export const adviceHanlder = (ctx: JoinPoint, context: Context) => {
    const proceedings = ctx.advisor.getProceeding(ctx.propertyKey, ctx.fullName, ctx.targetRef, ctx.target);
    if(proceedings?.length) {
        const chain = composeInterceptors(proceedings.map(r=> r.interceptor));
        return chain(ctx, originMethodHandler, context);
    }
    return originMethodHandler(ctx,context);
}

const ADVICES_INTERCEPTORS: InterceptorLike<JoinPoint>[] = [
    afterThrowingInterceptor,
    afterReturningIterceptor,
    afterIterceptor,
    beforeIterceptor,
    pointcutIterceptor,
];



function toHanlder(advices: Advicer[]): HandlerFn<JoinPoint> {
    return composeHandlers(advices.map(a => (input: JoinPoint, context?: any) => invokeAdvice(input, a)));
}


const aExp = /^@/;

function invokeAdvice(joinPoint: JoinPoint, advicer: Advicer) {
    if (joinPoint.destroyed) {
        throw new Error(`joinPoint is destroyed, when invoked advicer ${object2string(advicer)}.\n\njoinPoint object ${object2string(joinPoint, { fun: false, typeInst: true })}`)
    }

    const metadata = advicer.advice as AroundMetadata;
    if (!isNil(joinPoint.args) && metadata.args) {
        joinPoint.setValue(metadata.args, joinPoint.args)
    }

    if (metadata.annotationArgName) {
        if (metadata.annotationName) {
            let d: string = metadata.annotationName;
            d = d ? (aExp.test(d) ? d : `@${d}`) : '';
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations ? joinPoint.annotations.filter(v => v && v.decor.toString() == d).map(d => d.metadata) : [])
        } else {
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations?.map(d => d.metadata) ?? [])
        }
    }

    if (!isNil(joinPoint.returning) && metadata.returning) {
        joinPoint.setValue(metadata.returning, joinPoint.returning)
    }

    if (joinPoint.throwing && metadata.throwing) {
        joinPoint.setValue(metadata.throwing, joinPoint.throwing)
    }

    const context = advicer.aspect.context;
    if (context) {
        joinPoint.addRef(context)
    }

    return invokeTail(() => advicer.aspect.invoke(advicer.advice.propertyKey!, joinPoint), {
        finally: () => {
            context && joinPoint.removeRef(context);
        }
    });
}
