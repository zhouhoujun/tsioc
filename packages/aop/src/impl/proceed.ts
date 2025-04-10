import {
    isFunction, lang, Platform, ctorName, InvocationContext, LifeScope, HandlerFn,
    Context, ContextToken, invokeTail, RuntimeContext, InterceptorLike, isDefined,
    ParameterMetadata, Class, getClass, proxyTag, isObject, refl
} from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
// import { Advices, AdvicesMapping } from '../advices/Advices';
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
        // const targetType = ctx.type;
        const advisor = this.platform.context.get(Advisor);
        // const mapping = advisor.getMapping(targetType);
        // const advices = mapping?.get(ctorName) as Advices;
        ctx.isNewContext = false;
        if (!advisor.hasProp(ctx.class, ctorName)) {
            return invokeTail(() => next(ctx, context), () => {
                ctx.instance = this.attach(ctx.class, ctx.instance, advisor, ctx.context)
            });
        }

        return this.handle(ctx.class, `${ctx.class.className}.${ctorName}`, ctorName, advisor, ctx.platform, {
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
        if(!advisor) {
            advisor = this.platform.context.get(Advisor);
        }
        if (advisor && advisor.hasAnyProp(typeRef)) {
            return this.createProxy(typeRef.className, typeRef, instance, advisor, parent) as T;
        }
        return instance;
    }

    detach<T>(typeRef: Class<T>, instance: T): T {
        return instance;
    }

    protected createProxy(prefix: string, typeRef: Class | null, instance: any, advisor: Advisor, parent?: InvocationContext) {
        const descriptors = typeRef?.getPropertyDescriptors();

        const weekMap = new WeakMap();
        const proxy: any = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ctorName) return Reflect.get(target, name, receiver);
                const fullName = `${prefix}.${name.toString()}`;
                // const advices = mapping?.find(fullName);
                if (!advisor.match(name, fullName, typeRef, instance, 'get')) return Reflect.get(target, name, receiver);
                // if (advices instanceof AdvicesMapping) {
                //     const result = Reflect.get(target, name, receiver);
                //     let vpxy = weekMap.get(result);
                //     if (!vpxy) {
                //         vpxy = this.createProxy(fullName, advices.typeRef, result, advices, parent);
                //         weekMap.set(result, vpxy);
                //     }
                //     return vpxy;
                // }

                const descriptor = descriptors?.[name];
                if (isFunction(descriptor?.value)) {
                    const result = Reflect.get(target, name, receiver);
                    let proxyFn = weekMap.get(result);
                    if (!proxyFn) {
                        proxyFn = this.proxy(result, advisor, receiver ?? proxy, target, typeRef, fullName, name, parent) as ProxyFunction;
                        proxyFn[proxyTag] = true;
                        weekMap.set(result, proxyFn);
                    }
                    return proxyFn;
                }
                // if (!advices.hasGet() && !advices.hasSet()) return Reflect.get(target, name, receiver);
                return this.handle(typeRef, fullName, name, advices, this.platform, {
                    receiver: receiver ?? proxy,
                    target,
                    parent,
                    args: [],
                    accessor: 'get',
                    originProxy: (j) => {
                        const value = Reflect.get(target, name, receiver);
                        // const submapping = mapping?.getChild(name);
                        // if (submapping && isObject(value)) {
                        //     let vpxy = weekMap.get(value);
                        //     if (!vpxy) {
                        //         const vType = getClass(value);
                        //         vpxy = this.createProxy(fullName, vType ? refl.get(vType) : null, value, submapping, parent);
                        //         weekMap.set(value, vpxy);
                        //     }
                        //     value = vpxy;
                        // }

                        return { value }
                    },
                    next: (j) => j.returning.value
                });

            },
            set: (target, name, newValue, receiver) => {
                if (name === ctorName) return Reflect.set(target, name, receiver);
                const fullName = `${prefix}.${name.toString()}`;
                const advices = mapping?.find(fullName);

                if (!advices || advices instanceof AdvicesMapping || !advices.hasSet()) return Reflect.set(target, name, newValue, receiver);

                const oldValue = Reflect.get(target, name, receiver);
                return this.handle(typeRef, fullName, name, advisor, this.platform, {
                    receiver: receiver ?? proxy,
                    target,
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

        return proxy;
    }

    protected proxy(originMethod: Function, advices: Advices, receiver: any, target: any, targetRef: Class | null, fullName: string, propertyKey: string | symbol, parent?: InvocationContext) {
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
            return this.handle(targetRef, fullName, propertyKey, advices, platform, {
                receiver,
                target,
                originMethod,
                args,
                parent
            })
        }
    }

    private handle(targetRef: Class | null, fullName: string, propertyKey: string | symbol, advisor: Advisor, platform: Platform, options: {
        receiver?: any,
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
            targetRef,
            targetType: targetRef?.type,
            methodName: propertyKey,
            fullName,
            advisor,
            annotations: targetRef?.defs.filter(d => d.propertyKey === propertyKey),
        });
        if (options.parent) {
            joinPoint.onDestroy(options.parent)
        }

        return getAdvicesLifeScope(platform).handle(joinPoint, platform.context, options.next ?? (() => joinPoint.returning));
    }

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
        ctx.returning = ctx.originMethod?.apply(ctx.receiver ?? ctx.target, ctx.args)
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
