import {
    isFunction, lang, Platform, ctorName, InvocationContext, LifeScope, HandlerFn, Context, ContextToken,
    invokeTail, InterceptorChina, toHandler, RuntimeContext, InterceptorLike, isDefined, Class
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';

const proxyFlag = '_proxy';
export interface ProxyFunction extends Function {
    _proxy?: boolean;
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
        if (!advices) {
            return invokeTail(() => next(ctx, context), () => {
                ctx.instance = this.attach(ctx.class, ctx.instance, advisor)
            });
        }
        const { injector, args, params, context: parent } = ctx;
        const joinPoint = JoinPoint.create(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            targetType: targetType,
            methodName: ctorName,
            state: JoinpointState.Before,
            advices,
            args,
            params,
            parent
        });
        return getCtorAdvicesScope(this.platform).intercept(joinPoint, toHandler((joinPoint) => invokeTail(() => next(ctx, context), () => {
            let instance = joinPoint.returning = joinPoint.target = ctx.instance;
            instance = ctx.instance = this.attach(ctx.class, ctx.instance, advisor);
            return instance;
        })), this.platform.context);
    }


    attach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        // if (typeof Proxy === 'undefined') return this.noProxyAttach(typeRef, instance, advisor);
        // return this.proxyAttach(typeRef, instance, advisor);
        return this.noProxyAttach(typeRef, instance, advisor);
    }

    detach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        if (typeof Proxy === 'undefined') return this.noProxyDetach(typeRef, instance, advisor);
        return this.proxyDetach(typeRef, instance, advisor);
    }

    protected  proxyAttach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        const type = typeRef.type;
        const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(type);
        if (advicesMap && advicesMap.size && Array.from(advicesMap.keys()).some(i => i && i !== ctorName)) {
            return this.createProxy(typeRef, instance, advicesMap) as T;
        }
        return instance;
    }

    protected proxyDetach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
        if (advicesMap && advicesMap.size && Array.from(advicesMap.keys()).some(i => i && i !== ctorName)) {
            const decorators = typeRef.getPropertyDescriptors();
            advicesMap.forEach((advices, name) => {
                if (name === ctorName) {
                    return
                }
                const descriptor = decorators[name];
                if (!descriptor) return;

                if (descriptor.get || descriptor.set) {
                    if (descriptor.get) {
                        const getMth = descriptor.get.bind(instance);
                        Object.defineProperty(instance, name, {
                            get: () => {
                                return getMth()
                            }
                        })
                    }
                    if (descriptor.set) {
                        const setMth = descriptor.set.bind(instance);
                        Object.defineProperty(instance, name, {
                            set: (val) => {
                                setMth(val)
                            }
                        })
                    }
                } else if (isFunction(descriptor.value)) {
                    (instance as any)[name] = descriptor.value.bind(instance);
                } else {
                    (instance as any)[name] = (instance as any)[name];
                }
            })
        }
        return instance;
    }

    protected noProxyAttach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
        if (advicesMap && advicesMap.size) {
            const className = typeRef.className;
            const decorators = typeRef.getPropertyDescriptors();

            advicesMap.forEach((advices, name) => {
                if (name === ctorName) {
                    return
                }
                const pointcut = {
                    name: name,
                    fullName: `${className}.${name.toString()}`,
                    descriptor: decorators[name]
                }
                this.proceed(instance, typeRef, advices, pointcut)
            })
        }
        return instance;

    }

    protected noProxyDetach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T {
        const advicesMap = (advisor ?? this.platform.context.get(Advisor)).getAdvicesMap(typeRef.type);
        if (advicesMap && advicesMap.size) {
            const decorators = typeRef.getPropertyDescriptors();
            advicesMap.forEach((advices, name) => {
                if (name === ctorName) {
                    return
                }
                const descriptor = decorators[name];
                if (!descriptor) return;

                if (descriptor.get || descriptor.set) {
                    if (descriptor.get) {
                        const getMth = descriptor.get.bind(instance);
                        Object.defineProperty(instance, name, {
                            get: () => {
                                return getMth()
                            }
                        })
                    }
                    if (descriptor.set) {
                        const setMth = descriptor.set.bind(instance);
                        Object.defineProperty(instance, name, {
                            set: (val) => {
                                setMth(val)
                            }
                        })
                    }
                } else if (isFunction(descriptor.value)) {
                    (instance as any)[name] = descriptor.value.bind(instance);
                } else {
                    (instance as any)[name] = (instance as any)[name];
                }
            })
        }
        return instance;
    }

    protected createProxy(typeRef: Class, instance: any, advicesMap: Map<string | symbol, Advices>) {
        const className = typeRef.className;
        const descriptors = typeRef.getPropertyDescriptors();

        const weekMap = new WeakMap();

        const proxy = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ctorName) return Reflect.get(target, name, receiver);
                const advices = advicesMap.get(name);
                if (!advices) return Reflect.get(target, name, receiver);

                const descriptor = descriptors[name];
                if (descriptor.get || isFunction(descriptor.value)) {
                    const result = Reflect.get(target, name, receiver);
                    let proxyFn = weekMap.get(result);
                    if (!proxyFn) {
                        proxyFn = this.proxy(result.bind(target), advices, target, typeRef, {
                            name,
                            fullName: `${className}.${name.toString()}`,
                            descriptor
                        }) as ProxyFunction;
                        proxyFn[proxyFlag] = true;
                        // proxyFn = proxyFn.bind(target);
                        weekMap.set(result, proxyFn);
                    }
                    return proxyFn;
                } else {
                    return Reflect.get(target, name, receiver);
                }

            },
            set: (target, name, newValue, receiver) => {
                if (name === ctorName) return Reflect.set(target, name, receiver);
                const advices = advicesMap.get(name);
                if (!advices) return Reflect.set(target, name, newValue, receiver);
                const descriptor = descriptors[name];
                if (descriptor.set || isFunction(descriptor.value)) {
                    const result = (descriptor.set ?? descriptor.value).bind(target);
                    let proxyFn = weekMap.get(result);
                    if (!proxyFn) {
                        proxyFn = this.proxy(newValue, advices, target, typeRef, {
                            name,
                            fullName: `${className}.${name.toString()}`,
                            descriptor
                        }) as ProxyFunction;
                        proxyFn[proxyFlag] = true;
                        weekMap.set(result, proxyFn);
                    }
                    Reflect.set(target, name, proxyFn, receiver);
                    return true;
                }
                return Reflect.set(target, name, newValue, receiver);
            }
        });

        return proxy;
    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {JoinPoint} [provJoinpoint]
     */
    protected proceed(target: any, targetRef: Class, advices: Advices, pointcut: IPointcut) {
        if (advices && pointcut) {
            const methodName = pointcut.name;
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get) {
                    const getProxy = this.proxy(pointcut.descriptor.get.bind(target), advices, target, targetRef, pointcut);
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return getProxy()
                        }
                    })
                }
                if (pointcut.descriptor.set) {
                    const setProxy = this.proxy(pointcut.descriptor.set.bind(target), advices, target, targetRef, pointcut);
                    Object.defineProperty(target, methodName, {
                        set: (val) => {
                            setProxy(val)
                        }
                    })
                }
            } else if (isFunction(target[methodName]) && !target[methodName][proxyFlag]) {
                const propertyMethod = target[methodName];
                target[methodName] = this.proxy(propertyMethod, advices, target, targetRef, pointcut);
                target[methodName][proxyFlag] = true
            }
        }
    }

    protected proxy(propertyMethod: Function, advices: Advices, target: any, targetRef: Class, pointcut: IPointcut) {
        const fullName = pointcut.fullName;
        const name = pointcut.name;
        const platform = this.platform;
        return (...args: any[]) => {
            if (!platform || !platform.injector || platform.injector.destroyed) {
                return propertyMethod.call(target, ...args)
            }
            const larg = lang.last(args);
            let parent: InvocationContext | undefined;
            if (larg instanceof InvocationContext) {
                args = args.slice(0, args.length - 1);
                parent = larg
            }
            return this.handle(target, targetRef, propertyMethod, name, fullName, args, advices, platform, parent)
        }
    }

    private handle(target: any, targetRef: Class, originMethod: Function, propertyKey: string | symbol, fullName: string, args: any[], advices: Advices, platform: Platform, parent?: InvocationContext) {
        const joinPoint = JoinPoint.create(parent?.injector ?? platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            targetType: targetRef.type,
            methodName: propertyKey,
            fullName,
            params: targetRef.getParameters(propertyKey),
            args,
            target,
            advices,
            originMethod,
            annotations: targetRef.defs.filter(d => d.propertyKey === propertyKey),
            parent
        });
        if (parent) {
            joinPoint.onDestroy(parent)
        }

        return getMethodAdvicesScope(platform).handle(joinPoint, platform.context, (res) => joinPoint.returning);
    }

}


const CTOR_ADVICES_CHAIN = new ContextToken<InterceptorChina>(() => null!);
export function getCtorAdvicesScope(platform: Platform): InterceptorChina<JoinPoint> {
    let chain = platform.context.get(CTOR_ADVICES_CHAIN);
    if (!chain) {
        chain = new InterceptorChina<JoinPoint>(ADVICES_INTERCEPTORS.slice());
        platform.context.set(CTOR_ADVICES_CHAIN, chain);
    }
    return chain;
}


const METHOD_ADVICES = new ContextToken<LifeScope>(() => null!);
export function getMethodAdvicesScope(platform: Platform): LifeScope<JoinPoint> {
    let scope = platform.context.get(METHOD_ADVICES);
    if (!scope) {
        scope = new LifeScope<JoinPoint>(platform, originMethodHandler, ADVICES_INTERCEPTORS);
        platform.context.set(METHOD_ADVICES, scope);
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
