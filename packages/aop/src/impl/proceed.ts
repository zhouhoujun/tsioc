import {
    isFunction, lang, Runtime, ctorName, RuntimeHandler, HandlerFn,
    Context, ContextToken, invokeTail, InterceptorLike, isDefined,
    Parameters, ClassRef, proxyTag, isObject, isNil, object2string, getClassify,
    composeHandlers, composeInterceptors, Injector, AbstractInjector, RuntimeContext,
    EnvironmentInjector
} from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';
import { Advicer } from '../Advicer';
import { AroundMetadata } from '../metadata/meta';


const POINTCUT = new ContextToken(() => false);

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope implements Proceeding {
    constructor(
        readonly runtime: Runtime
    ) { }


    pointcutCtor(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) {
        const advisor = context.runtime.get(Advisor);
        if (!advisor.hasCtor(typeRef)) {
            return invokeTail(() => next(typeRef, context), (instance) => {
                if (advisor.hasPointcut(instance, typeRef, true)) {
                    context.set(POINTCUT, true);
                    // ctx.isNewContext = false;
                }
                return instance;
            });
        }

        // ctx.isNewContext = false;
        return this.handle(typeRef, `${typeRef.className}.${ctorName}`, ctorName, null, advisor, context.runtime, {
            parent: context.raiseInjector,
            args: context.args ?? [],
            params: context.params ?? [],
            originProxy: (joinPoint) => {
                invokeTail(() => next(typeRef, context), (instance) => {
                    instance = joinPoint.returning = joinPoint.target = context.instance;
                    return instance;
                })
            },
        })

    }

    pointcutProperty(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) {
        return invokeTail(() => next(typeRef, context), (instance) => {
            const advisor = context.runtime.get(Advisor);
            if (isDefined(instance) && (context.has(POINTCUT) || advisor.hasPointcut(instance, typeRef, true))) {
               instance = context.instance = this.createProxy(typeRef.className, typeRef, instance, typeRef, instance, advisor, context.raiseInjector)
            }
            return instance;
        });
    }

    protected createProxy(prefix: string, rootRef: ClassRef, root: any, typeRef: ClassRef | null, instance: any, advisor: Advisor, parent?: Injector) {
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

                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, this.runtime, {
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
                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, this.runtime, {
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

    protected proxy<T>(originMethod: Function, propertyKey: string | symbol, fullName: string, advisor: Advisor, receiver: T, target: any, targetRef: ClassRef, parent?: Injector) {
        const runtime = this.runtime;
        return (...args: any[]) => {
            if (!runtime || !runtime.has(EnvironmentInjector) || runtime.get(EnvironmentInjector).destroyed) {
                return originMethod.call(target, ...args)
            }
            const larg = lang.last(args);
            if (target[proxyTag] && larg instanceof AbstractInjector) {
                args = args.slice(0, args.length - 1);
                parent = larg
            }
            return this.handle(targetRef, fullName, propertyKey, receiver, advisor, runtime, {
                target,
                originMethod,
                args,
                parent
            })
        }
    }

    private handle(targetRef: ClassRef, fullName: string, propertyKey: string | symbol, receiver: any, advisor: Advisor, runtime: Runtime, options: {
        target?: any,
        originMethod?: Function,
        args?: any[];
        accessor?: 'get' | 'set';
        params?: Parameters;
        valueChange?: { newValue: any, oldValue: any },
        parent?: Injector,
        originProxy?: (joinPoint: JoinPoint) => any,
        next?: (res: JoinPoint) => any
    } = {}): any {
        if (!options.params) {
            options.params = targetRef?.getParameters(propertyKey);
        }
        const joinPoint = JoinPoint.create(options.parent ?? runtime.getInjector('root') ?? runtime.getInjector('platform'), {
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

        return getAdvicesLifeScope(runtime).handle(joinPoint, runtime, options.next ?? (() => joinPoint.returning));
    }

}



const ADVICES_SCOPE = new ContextToken<RuntimeHandler>(() => null!);
export function getAdvicesLifeScope(runtime: Runtime): RuntimeHandler<JoinPoint> {
    let scope = runtime.get(ADVICES_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<JoinPoint>(runtime, adviceHanlder, ADVICES_INTERCEPTORS);
        runtime.set(ADVICES_SCOPE, scope);
    }
    return scope;
}



export const afterReturningIterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => next(jp, context), (res) => {
        jp.state = JoinpointState.AfterReturning;
        if (isDefined(res) && res !== jp) jp.returning = res;
        const advicers = jp.advisor.getAfterReturning(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    })
}

export const afterThrowingInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => next(jp, context), {
        error: (error) => {
            jp.throwing = error;
            jp.state = JoinpointState.AfterThrowing;
            const advicers = jp.advisor.getAfterThrowing(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
            if (advicers?.length) {
                return toHanlder(advicers)(jp, context);
            }
        },
    });
}

export const beforeIterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => {
        jp.state = JoinpointState.Before;
        const advicers = jp.advisor.getBefore(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
}

export const pointcutIterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => {
        jp.state = JoinpointState.Pointcut;
        const advicers = jp.advisor.getPointcut(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
}

export const afterIterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => next(jp, context), (res) => {
        jp.state = JoinpointState.After;
        if (isDefined(res) && res !== jp) jp.returning = res;
        const advicers = jp.advisor.getAfter(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    });
}



export const originMethodHandler = (jp: JoinPoint, context: RuntimeContext) => {
    if (jp.originProxy) {
        jp.returning = jp.originProxy(jp)
    } else {
        jp.returning = jp.originMethod?.apply(jp.receiver ?? jp.target, jp.args)
    }
    return jp.returning;
}

export const adviceHanlder = (jp: JoinPoint, context: RuntimeContext) => {
    const proceedings = jp.advisor.getProceeding(jp.propertyKey, jp.fullName, jp.targetRef, jp.target);
    if (proceedings?.length) {
        const chain = composeInterceptors(proceedings.map(r => r.interceptor));
        return chain(jp, originMethodHandler, context);
    }
    return originMethodHandler(jp, context);
}

const ADVICES_INTERCEPTORS: InterceptorLike<JoinPoint>[] = [
    afterThrowingInterceptor,
    afterReturningIterceptor,
    afterIterceptor,
    beforeIterceptor,
    pointcutIterceptor,
];



function toHanlder(advices: Advicer[]): HandlerFn<JoinPoint, RuntimeContext> {
    return composeHandlers(advices.map(a => (input: JoinPoint, context: RuntimeContext) => invokeAdvice(input, a, context)));
}


const aExp = /^@/;

function invokeAdvice(joinPoint: JoinPoint, advicer: Advicer, runtime: RuntimeContext) {
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
