import {
    isFunction, lang, Runtime, ctorName, RuntimeHandler, HandlerFn,
    ContextToken, invokeTail, InterceptorLike, isDefined,
    Parameters, ClassRef, proxyTag, isObject, isNil, object2string, getClassify,
    composeHandlers, composeInterceptors, Injector, AbstractInjector, RuntimeContext,
    EnvironmentInjector, onSettled
} from '@tsdi/ioc';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';
import { Advicer } from '../Advicer';
import { AroundMetadata } from '../metadata/meta';
const POINTCUT = new ContextToken(() => false);

/**
 * Resolved pointcut decision for one property of one advised instance.
 */
interface PropertyMatch {
    fullName: string;
    host: boolean;
    method: boolean;
    get: boolean;
    set: boolean;
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
        readonly runtime: Runtime
    ) { }


    pointcutCtor(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) {
        const advisor = context.runtime.get(Advisor);
        if (!advisor.hasCtor(typeRef)) {
            return invokeTail(next, (instance) => {
                if (advisor.hasPointcut(instance, typeRef, true)) {
                    context.set(POINTCUT, true);
                    // ctx.isNewContext = false;
                }
                return instance;
            }, typeRef, context);
        }

        // ctx.isNewContext = false;
        return this.handle(typeRef, `${typeRef.className}.${ctorName}`, ctorName, null, advisor, context.runtime, {
            parent: context.raiseInjector,
            args: context.args ?? [],
            params: context.params ?? [],
            originProxy: (joinPoint) => {
                return invokeTail(next, (instance) => {
                    instance = joinPoint.returning = joinPoint.target = context.instance ?? instance;
                    return instance;
                }, typeRef, context)
            },
        })

    }

    pointcutProperty(typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) {
        return invokeTail(next, (instance) => {
            const advisor = context.runtime.get(Advisor);
            if (isDefined(instance) && (context.has(POINTCUT) || advisor.hasPointcut(instance, typeRef, true))) {
                instance = context.instance = this.createProxy(typeRef.className, typeRef, instance, typeRef, instance, advisor, context.raiseInjector)
            }
            return instance;
        }, typeRef, context);
    }

    protected createProxy(prefix: string, rootRef: ClassRef, root: any, typeRef: ClassRef | null, instance: any, advisor: Advisor, parent?: Injector) {
        const descriptors = typeRef?.getPropertyDescriptors();
        const weakMap = new WeakMap();
        const runtime = this.runtime;

        // A property access on an advised instance would otherwise re-run
        // pointcut matching (host / method / accessor) on every read. Resolve
        // it once per property and reuse until advice changes.
        const decisions = new Map<string | symbol, PropertyMatch>();
        let matchVersion = -1;

        const matchOf = (name: string | symbol): PropertyMatch => {
            if (matchVersion !== advisor.version) {
                matchVersion = advisor.version;
                decisions.clear();
            }
            let decision = decisions.get(name);
            if (!decision) {
                const fullName = `${prefix}.${name.toString()}`;
                decision = {
                    fullName,
                    host: advisor.match(name, fullName, rootRef, root, { way: 'host' }),
                    method: advisor.match(name, fullName, rootRef, instance),
                    get: advisor.match(name, fullName, rootRef, instance, { accessor: 'get' }),
                    set: advisor.match(name, fullName, rootRef, instance, { accessor: 'set' })
                };
                decisions.set(name, decision);
            }
            return decision;
        };

        const proxy: any = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ctorName || name === proxyTag) return target[name];

                const decision = matchOf(name);
                if (decision.host) {
                    const result = target[name];
                    if (!isObject(result)) {
                        return result;
                    }
                    let vpxy = weakMap.get(result);
                    if (!vpxy) {
                        vpxy = this.createProxy(decision.fullName, rootRef, root, getClassify(result), result, advisor, parent);
                        weakMap.set(result, vpxy);
                    }
                    return vpxy;
                }

                const descriptor = descriptors?.[name];
                if (isFunction(descriptor?.value)) {
                    const result = target[name];
                    let cachedFn = weakMap.get(result);
                    if (!cachedFn) {
                        if (decision.method) {
                            cachedFn = this.proxy(result, name, decision.fullName, advisor, receiver ?? proxy, root, rootRef, parent);
                        } else {
                            cachedFn = result;
                        }
                        weakMap.set(result, cachedFn);
                    }
                    return cachedFn;
                }

                if (!decision.get) {
                    return target[name];
                }

                return this.handle(rootRef, decision.fullName, name, receiver ?? proxy, advisor, runtime, {
                    target: root,
                    parent,
                    args: [],
                    accessor: 'get',
                    originProxy: (j) => {
                        return { value: target[name] };
                    },
                    next: (j) => j.returning.value
                });

            },
            set: (target, name, newValue, receiver) => {
                if (name === ctorName || name === proxyTag) return (target[name] = newValue) || true;

                const decision = matchOf(name);
                if (!decision.set) {
                    return (target[name] = newValue) || true;
                }

                const oldValue = target[name];
                return this.handle(rootRef, decision.fullName, name, receiver ?? proxy, advisor, runtime, {
                    target: root,
                    parent,
                    args: [],
                    accessor: 'set',
                    valueChange: { newValue, oldValue },
                    originProxy: (j) => {
                        return (target[name] = newValue) || true;
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

        // The joinpoint is a synthetic, per-invocation injector and nothing else
        // owns it (`registerToParent() === false`). Dispose it once the advice
        // chain settles, otherwise every advised call keeps an injector, its
        // records and its run context alive for the lifetime of the process.
        let result: any;
        try {
            result = getAdvicesLifeScope(runtime)
                .handle(joinPoint, runtime as any, options.next ?? (() => joinPoint.returning));
        } catch (err) {
            joinPoint.destroy();
            throw err;
        }

        return onSettled(result, () => joinPoint.destroy());
    }

}



const ADVICES_SCOPE = new ContextToken<RuntimeHandler<JoinPoint, any, RuntimeContext>>(() => null!);
export function getAdvicesLifeScope(runtime: Runtime): RuntimeHandler<JoinPoint, any, RuntimeContext> {
    let scope = runtime.get(ADVICES_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<JoinPoint, any, RuntimeContext>(adviceHanlder, ADVICES_INTERCEPTORS);
        runtime.set(ADVICES_SCOPE, scope);
    }
    return scope;
}



export const afterReturningInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(next, (res) => {
        jp.state = JoinpointState.AfterReturning;
        if (isDefined(res) && res !== jp) jp.returning = res;
        const advicers = jp.advisor.getAfterReturning(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, jp, context)
}

export const afterThrowingInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(next, {
        error: (error) => {
            jp.throwing = error;
            jp.state = JoinpointState.AfterThrowing;
            const advicers = jp.advisor.getAfterThrowing(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
            if (advicers?.length) {
                return toHanlder(advicers)(jp, context);
            }
        },
    }, jp, context);
}

export const beforeInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => {
        jp.state = JoinpointState.Before;
        const advicers = jp.advisor.getBefore(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
}

export const pointcutInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => {
        jp.state = JoinpointState.Pointcut;
        const advicers = jp.advisor.getPointcut(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
}

export const afterInterceptor = (jp: JoinPoint, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(next, (res) => {
        jp.state = JoinpointState.After;
        if (isDefined(res) && res !== jp) jp.returning = res;
        const advicers = jp.advisor.getAfter(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, jp, context);
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
    afterReturningInterceptor,
    afterInterceptor,
    beforeInterceptor,
    pointcutInterceptor,
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

    // Context lifecycle is managed by the aspect, no need for ref management
    return invokeTail(() => advicer.aspect.invoke(advicer.advice.propertyKey!, joinPoint), {
        finally: () => {
            // Cleanup handled by aspect context lifecycle
        }
    });
}
