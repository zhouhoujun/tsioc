import {
    isFunction, lang, Platform, ctorName, InvocationContext, LifeScope, HandlerFn,
    Context, ContextToken, invokeTail, RuntimeContext, InterceptorLike, isDefined, Class,
    ParameterMetadata, proxyTag
} from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';


export interface ProxyFunction extends Function {
    [proxyTag]?: boolean;
}

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


    pointcut(ctx: RuntimeContext, next: HandlerFn, context: Context) {
        const targetType = ctx.type;
        const advisor = this.platform.context.get(Advisor);
        const advices = advisor.getAdvices(targetType, ctorName);
        ctx.isNewContext = false;
        if (!advices) {
            return invokeTail(() => next(ctx, context), () => {
                ctx.instance = this.attach(ctx.class, ctx.instance, advisor, ctx.context)
            });
        }

        return this.handle(null, ctx.class, ctorName, advices, ctx.platform, {
            parent: ctx.context,
            args: ctx.args,
            params: ctx.params,
            originProxy: (joinPoint) => {
                invokeTail(() => next(ctx, context), () => {
                    let instance = joinPoint.returning = joinPoint.target = ctx.instance;
                    instance = ctx.instance = this.attach(ctx.class, ctx.instance, advisor, ctx.context);
                    return instance;
                })
            },
        })

    }


    attach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor, parent?: InvocationContext): T {
        //es5 proxy-polyfill
        // return this.noProxyAttach(typeRef, instance, advisor);
        const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
        if (advicesMap && advicesMap.size && Array.from(advicesMap.keys()).some(i => i && i !== ctorName)) {
            return this.createProxy(typeRef, instance, advicesMap, parent) as T;
        }
        return instance;
    }

    detach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        return instance;
    }

    protected createProxy(typeRef: Class, instance: any, advicesMap: Map<string | symbol, Advices>, parent?: InvocationContext) {
        const descriptors = typeRef.getPropertyDescriptors();

        const weekMap = new WeakMap();
        const proxy: any = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ctorName) return Reflect.get(target, name, receiver);
                const advices = advicesMap.get(name);
                if (!advices) return Reflect.get(target, name, receiver);

                const descriptor = descriptors[name];
                if (isFunction(descriptor.value)) {
                    const result = Reflect.get(target, name, receiver);
                    let proxyFn = weekMap.get(result);
                    if (!proxyFn) {
                        proxyFn = this.proxy(result.bind(receiver ?? proxy), advices, target, typeRef, name, parent) as ProxyFunction;
                        proxyFn[proxyTag] = true;
                        weekMap.set(result, proxyFn);
                    }
                    return proxyFn;
                }
                return this.handle(receiver ?? proxy, typeRef, name, advices, this.platform, {
                    parent,
                    args: [],
                    originProxy: (j) => {
                        return { value: Reflect.get(target, name, receiver) }
                    },
                    next: (j) => j.returning.value
                });

            },
            set: (target, name, newValue, receiver) => {
                if (name === ctorName) return Reflect.set(target, name, receiver);
                const advices = advicesMap.get(name);
                if (!advices) return Reflect.set(target, name, newValue, receiver);
                const oldValue = Reflect.get(target, name, receiver);
                return this.handle(receiver ?? proxy, typeRef, name, advices, this.platform, {
                    parent,
                    args: [],
                    valueChange: { newValue, oldValue },
                    originProxy: (j) => {
                        return Reflect.set(target, name, newValue, receiver);
                    }
                });
            }
        });

        return proxy;
    }
    protected proxy(originMethod: Function, advices: Advices, target: any, targetRef: Class, propertyKey: string | symbol, parent?: InvocationContext) {
        const platform = this.platform;
        return (...args: any[]) => {
            if (!platform || !platform.injector || platform.injector.destroyed) {
                return originMethod.call(target, ...args)
            }
            const larg = lang.last(args);
            if (larg instanceof InvocationContext) {
                args = args.slice(0, args.length - 1);
                parent = larg
            }
            return this.handle(target, targetRef, propertyKey, advices, platform, {
                originMethod,
                args,
                parent
            })
        }
    }

    private handle(target: any, targetRef: Class, propertyKey: string | symbol, advices: Advices, platform: Platform, options: {
        originMethod?: Function,
        args?: any[];
        params?: ParameterMetadata[];
        valueChange?: { newValue: any, oldValue: any },
        parent?: InvocationContext,
        originProxy?: (joinPoint: JoinPoint) => any,
        next?: (res: JoinPoint) => any
    } = {}): any {
        const fullName = `${targetRef.className}.${propertyKey.toString()}`;
        if (!options.params) {
            options.params = targetRef.getParameters(propertyKey);
        }
        const joinPoint = JoinPoint.create(options.parent?.injector ?? platform.getInjector('root') ?? platform.getInjector('platform'), {
            ...options,
            targetType: targetRef.type,
            methodName: propertyKey,
            fullName,
            target,
            advices,
            annotations: targetRef.defs.filter(d => d.propertyKey === propertyKey),
        });
        if (options.parent) {
            joinPoint.onDestroy(options.parent)
        }

        return getAdvicesLifeScope(platform).handle(joinPoint, platform.context, options.next ?? (() => joinPoint.returning));
    }

    
    // protected customAttach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor, parent?: InvocationContext): T {
    //     const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
    //     if (advicesMap && advicesMap.size) {
    //         const decorators = typeRef.getPropertyDescriptors();

    //         advicesMap.forEach((advices, name) => {
    //             if (name === ctorName) {
    //                 return
    //             }
    //             this.proceed(instance, typeRef, advices, name, decorators[name], parent)
    //         })
    //     }
    //     return instance;

    // }

    // protected customDetach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
    //     const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
    //     if (advicesMap && advicesMap.size) {
    //         const decorators = typeRef.getPropertyDescriptors();
    //         advicesMap.forEach((advices, name) => {
    //             if (name === ctorName) {
    //                 return
    //             }
    //             const descriptor = decorators[name];
    //             if (!descriptor) return;

    //             if (descriptor.get || descriptor.set) {
    //                 if (descriptor.get) {
    //                     const getMth = descriptor.get.bind(instance);
    //                     Object.defineProperty(instance, name, {
    //                         get: () => {
    //                             return getMth()
    //                         }
    //                     })
    //                 }
    //                 if (descriptor.set) {
    //                     const setMth = descriptor.set.bind(instance);
    //                     Object.defineProperty(instance, name, {
    //                         set: (val) => {
    //                             setMth(val)
    //                         }
    //                     })
    //                 }
    //             } else if (isFunction(descriptor.value)) {
    //                 (instance as any)[name] = descriptor.value.bind(instance);
    //             } else {
    //                 (instance as any)[name] = (instance as any)[name];
    //             }
    //         })
    //     }
    //     return instance;
    // }    

    // /**
    //  * proceed the proxy method.
    //  *
    //  * @param {*} target
    //  * @param {Type} targetType
    //  * @param {IPointcut} pointcut
    //  * @param {JoinPoint} [provJoinpoint]
    //  */
    // protected proceed(target: any, targetRef: Class, advices: Advices, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>, parent?: InvocationContext) {
    //     if (advices && propertyKey && descriptor) {
    //         if (descriptor.get || descriptor.set) {
    //             if (descriptor.get) {
    //                 const getProxy = this.proxy(descriptor.get.bind(target), advices, target, targetRef, propertyKey, parent);
    //                 Object.defineProperty(target, propertyKey, {
    //                     get: () => {
    //                         return getProxy()
    //                     }
    //                 })
    //             }
    //             if (descriptor.set) {
    //                 const setProxy = this.proxy(descriptor.set.bind(target), advices, target, targetRef, propertyKey, parent);
    //                 Object.defineProperty(target, propertyKey, {
    //                     set: (val) => {
    //                         setProxy(val)
    //                     }
    //                 })
    //             }
    //         } else if (isFunction(target[propertyKey]) && !target[propertyKey][proxyTag]) {
    //             const propertyMethod = target[propertyKey];
    //             target[propertyKey] = this.proxy(propertyMethod, advices, target, targetRef, propertyKey, parent);
    //             target[propertyKey][proxyTag] = true
    //         }
    //     }
    // }

}



const ADVICES_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getAdvicesLifeScope(platform: Platform): LifeScope<JoinPoint> {
    let scope = platform.context.get(ADVICES_SCOPE);
    if (!scope) {
        scope = new LifeScope<JoinPoint>(platform, originMethodHandler, ADVICES_INTERCEPTORS);
        platform.context.set(ADVICES_SCOPE, scope);
    }
    return scope;
}



export const afterReturningIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), (res) => {
        ctx.state = JoinpointState.AfterReturning;
        if (isDefined(res) && res !== ctx) ctx.returning = res;
        return ctx.advices.getAfterReturningHanlder()?.(ctx, context);
    })
}

export const afterThrowingInterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), {
        error: (error) => {
            ctx.throwing = error;
            ctx.state = JoinpointState.AfterThrowing;
            return ctx.advices.getAfterThrowingHanlder()?.(ctx, context);
        },
    });
}


export const beforeIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => {
        ctx.state = JoinpointState.Before;
        return ctx.advices.getBeforeHanlder()?.(ctx, context)
    }, () => next(ctx, context));
}

export const pointcutIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => {
        ctx.state = JoinpointState.Pointcut;
        return ctx.advices.getPointcutHanlder()?.(ctx, context)
    }, () => next(ctx, context));
}

export const afterIterceptor = (ctx: JoinPoint, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), (res) => {
        ctx.state = JoinpointState.After;
        if (isDefined(res) && res !== ctx) ctx.returning = res;
        return ctx.advices.getAfterHanlder()?.(ctx, context);
    });
}



export const originMethodHandler = (ctx: JoinPoint, context: Context) => {
    if (ctx.originProxy) {
        ctx.returning = ctx.originProxy(ctx)
    } else {
        ctx.returning = ctx.originMethod?.apply(ctx.target, ctx.args)
    }
    return ctx.returning;
}

const ADVICES_INTERCEPTORS: InterceptorLike<JoinPoint>[] = [
    afterThrowingInterceptor,
    afterReturningIterceptor,
    afterIterceptor,
    beforeIterceptor,
    pointcutIterceptor,
];
