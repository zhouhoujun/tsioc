"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adviceHanlder = exports.originMethodHandler = exports.afterIterceptor = exports.pointcutIterceptor = exports.beforeIterceptor = exports.afterThrowingInterceptor = exports.afterReturningIterceptor = exports.ProceedingScope = void 0;
exports.getAdvicesLifeScope = getAdvicesLifeScope;
const ioc_1 = require("@tsdi/ioc");
const JoinPoint_1 = require("../joinpoints/JoinPoint");
const state_1 = require("../joinpoints/state");
const Advisor_1 = require("../Advisor");
const POINTCUT = new ioc_1.ContextToken(() => false);
/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
class ProceedingScope {
    constructor(runtime) {
        this.runtime = runtime;
    }
    pointcutCtor(typeRef, next, context) {
        const advisor = context.runtime.get(Advisor_1.Advisor);
        if (!advisor.hasCtor(typeRef)) {
            return (0, ioc_1.invokeTail)(next, (instance) => {
                if (advisor.hasPointcut(instance, typeRef, true)) {
                    context.set(POINTCUT, true);
                    // ctx.isNewContext = false;
                }
                return instance;
            }, typeRef, context);
        }
        // ctx.isNewContext = false;
        return this.handle(typeRef, `${typeRef.className}.${ioc_1.ctorName}`, ioc_1.ctorName, null, advisor, context.runtime, {
            parent: context.raiseInjector,
            args: context.args ?? [],
            params: context.params ?? [],
            originProxy: (joinPoint) => {
                return (0, ioc_1.invokeTail)(next, (instance) => {
                    instance = joinPoint.returning = joinPoint.target = context.instance ?? instance;
                    return instance;
                }, typeRef, context);
            },
        });
    }
    pointcutProperty(typeRef, next, context) {
        return (0, ioc_1.invokeTail)(next, (instance) => {
            const advisor = context.runtime.get(Advisor_1.Advisor);
            if ((0, ioc_1.isDefined)(instance) && (context.has(POINTCUT) || advisor.hasPointcut(instance, typeRef, true))) {
                instance = context.instance = this.createProxy(typeRef.className, typeRef, instance, typeRef, instance, advisor, context.raiseInjector);
            }
            return instance;
        }, typeRef, context);
    }
    createProxy(prefix, rootRef, root, typeRef, instance, advisor, parent) {
        const descriptors = typeRef?.getPropertyDescriptors();
        const weekMap = new WeakMap();
        const runtime = this.runtime;
        const proxy = new Proxy(instance, {
            get: (target, name, receiver) => {
                if (name === ioc_1.ctorName || name === ioc_1.proxyTag)
                    return target[name];
                const nameStr = name.toString();
                const fullName = `${prefix}.${nameStr}`;
                if (advisor.match(name, fullName, rootRef, root, { way: 'host' })) {
                    const result = target[name];
                    if (!(0, ioc_1.isObject)(result)) {
                        return result;
                    }
                    let vpxy = weekMap.get(result);
                    if (!vpxy) {
                        vpxy = this.createProxy(fullName, rootRef, root, (0, ioc_1.getClassify)(result), result, advisor, parent);
                        weekMap.set(result, vpxy);
                    }
                    return vpxy;
                }
                const descriptor = descriptors?.[name];
                if ((0, ioc_1.isFunction)(descriptor?.value)) {
                    const result = target[name];
                    let cachedFn = weekMap.get(result);
                    if (!cachedFn) {
                        if (advisor.match(name, fullName, rootRef, instance)) {
                            cachedFn = this.proxy(result, name, fullName, advisor, receiver ?? proxy, root, rootRef, parent);
                        }
                        else {
                            cachedFn = result;
                        }
                        weekMap.set(result, cachedFn);
                    }
                    return cachedFn;
                }
                if (!advisor.match(name, fullName, rootRef, instance, { accessor: 'get' })) {
                    return target[name];
                }
                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, runtime, {
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
                if (name === ioc_1.ctorName || name === ioc_1.proxyTag)
                    return (target[name] = newValue) || true;
                const nameStr = name.toString();
                const fullName = `${prefix}.${nameStr}`;
                if (!advisor.match(name, fullName, rootRef, instance, { accessor: 'set' })) {
                    return (target[name] = newValue) || true;
                }
                const oldValue = target[name];
                return this.handle(rootRef, fullName, name, receiver ?? proxy, advisor, runtime, {
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
        proxy[ioc_1.proxyTag] = true;
        return proxy;
    }
    proxy(originMethod, propertyKey, fullName, advisor, receiver, target, targetRef, parent) {
        const runtime = this.runtime;
        return (...args) => {
            if (!runtime || !runtime.has(ioc_1.EnvironmentInjector) || runtime.get(ioc_1.EnvironmentInjector).destroyed) {
                return originMethod.call(target, ...args);
            }
            const larg = ioc_1.lang.last(args);
            if (target[ioc_1.proxyTag] && larg instanceof ioc_1.AbstractInjector) {
                args = args.slice(0, args.length - 1);
                parent = larg;
            }
            return this.handle(targetRef, fullName, propertyKey, receiver, advisor, runtime, {
                target,
                originMethod,
                args,
                parent
            });
        };
    }
    handle(targetRef, fullName, propertyKey, receiver, advisor, runtime, options = {}) {
        if (!options.params) {
            options.params = targetRef?.getParameters(propertyKey);
        }
        const joinPoint = JoinPoint_1.JoinPoint.create(options.parent ?? runtime.getInjector('root') ?? runtime.getInjector('platform'), {
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
            joinPoint.onDestroy(options.parent);
        }
        return getAdvicesLifeScope(runtime).handle(joinPoint, runtime, options.next ?? (() => joinPoint.returning));
    }
}
exports.ProceedingScope = ProceedingScope;
const ADVICES_SCOPE = new ioc_1.ContextToken(() => null);
function getAdvicesLifeScope(runtime) {
    let scope = runtime.get(ADVICES_SCOPE);
    if (!scope) {
        scope = new ioc_1.RuntimeHandler(exports.adviceHanlder, ADVICES_INTERCEPTORS);
        runtime.set(ADVICES_SCOPE, scope);
    }
    return scope;
}
const afterReturningIterceptor = (jp, next, context) => {
    return (0, ioc_1.invokeTail)(next, (res) => {
        jp.state = state_1.JoinpointState.AfterReturning;
        if ((0, ioc_1.isDefined)(res) && res !== jp)
            jp.returning = res;
        const advicers = jp.advisor.getAfterReturning(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, jp, context);
};
exports.afterReturningIterceptor = afterReturningIterceptor;
const afterThrowingInterceptor = (jp, next, context) => {
    return (0, ioc_1.invokeTail)(next, {
        error: (error) => {
            jp.throwing = error;
            jp.state = state_1.JoinpointState.AfterThrowing;
            const advicers = jp.advisor.getAfterThrowing(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
            if (advicers?.length) {
                return toHanlder(advicers)(jp, context);
            }
        },
    }, jp, context);
};
exports.afterThrowingInterceptor = afterThrowingInterceptor;
const beforeIterceptor = (jp, next, context) => {
    return (0, ioc_1.invokeTail)(() => {
        jp.state = state_1.JoinpointState.Before;
        const advicers = jp.advisor.getBefore(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
};
exports.beforeIterceptor = beforeIterceptor;
const pointcutIterceptor = (jp, next, context) => {
    return (0, ioc_1.invokeTail)(() => {
        jp.state = state_1.JoinpointState.Pointcut;
        const advicers = jp.advisor.getPointcut(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, () => next(jp, context));
};
exports.pointcutIterceptor = pointcutIterceptor;
const afterIterceptor = (jp, next, context) => {
    return (0, ioc_1.invokeTail)(next, (res) => {
        jp.state = state_1.JoinpointState.After;
        if ((0, ioc_1.isDefined)(res) && res !== jp)
            jp.returning = res;
        const advicers = jp.advisor.getAfter(jp.propertyKey, jp.fullName, jp.targetRef, jp.target, { accessor: jp.accessor });
        if (advicers?.length) {
            return toHanlder(advicers)(jp, context);
        }
    }, jp, context);
};
exports.afterIterceptor = afterIterceptor;
const originMethodHandler = (jp, context) => {
    if (jp.originProxy) {
        jp.returning = jp.originProxy(jp);
    }
    else {
        jp.returning = jp.originMethod?.apply(jp.receiver ?? jp.target, jp.args);
    }
    return jp.returning;
};
exports.originMethodHandler = originMethodHandler;
const adviceHanlder = (jp, context) => {
    const proceedings = jp.advisor.getProceeding(jp.propertyKey, jp.fullName, jp.targetRef, jp.target);
    if (proceedings?.length) {
        const chain = (0, ioc_1.composeInterceptors)(proceedings.map(r => r.interceptor));
        return chain(jp, exports.originMethodHandler, context);
    }
    return (0, exports.originMethodHandler)(jp, context);
};
exports.adviceHanlder = adviceHanlder;
const ADVICES_INTERCEPTORS = [
    exports.afterThrowingInterceptor,
    exports.afterReturningIterceptor,
    exports.afterIterceptor,
    exports.beforeIterceptor,
    exports.pointcutIterceptor,
];
function toHanlder(advices) {
    return (0, ioc_1.composeHandlers)(advices.map(a => (input, context) => invokeAdvice(input, a, context)));
}
const aExp = /^@/;
function invokeAdvice(joinPoint, advicer, runtime) {
    if (joinPoint.destroyed) {
        throw new Error(`joinPoint is destroyed, when invoked advicer ${(0, ioc_1.object2string)(advicer)}.\n\njoinPoint object ${(0, ioc_1.object2string)(joinPoint, { fun: false, typeInst: true })}`);
    }
    const metadata = advicer.advice;
    if (!(0, ioc_1.isNil)(joinPoint.args) && metadata.args) {
        joinPoint.setValue(metadata.args, joinPoint.args);
    }
    if (metadata.annotationArgName) {
        if (metadata.annotationName) {
            let d = metadata.annotationName;
            d = d ? (aExp.test(d) ? d : `@${d}`) : '';
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations ? joinPoint.annotations.filter(v => v && v.decor.toString() == d).map(d => d.metadata) : []);
        }
        else {
            joinPoint.setValue(metadata.annotationArgName, joinPoint.annotations?.map(d => d.metadata) ?? []);
        }
    }
    if (!(0, ioc_1.isNil)(joinPoint.returning) && metadata.returning) {
        joinPoint.setValue(metadata.returning, joinPoint.returning);
    }
    if (joinPoint.throwing && metadata.throwing) {
        joinPoint.setValue(metadata.throwing, joinPoint.throwing);
    }
    // Context lifecycle is managed by the aspect, no need for ref management
    return (0, ioc_1.invokeTail)(() => advicer.aspect.invoke(advicer.advice.propertyKey, joinPoint), {
        finally: () => {
            // Cleanup handled by aspect context lifecycle
        }
    });
}
//# sourceMappingURL=proceed.js.map