import {
    Type, isFunction, lang, Platform, isNil, isPromise, refl, EMPTY,
    ParameterMetadata, IocActions, IActionSetup, InvocationContext, Injector
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';
import { ADVISOR } from '../metadata/tk';
import { AroundMetadata } from '../metadata/meta';

const proxyFlag = '_proxy';
const ctor = 'constructor';
const aExp = /^@/;

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope extends IocActions<Joinpoint> implements IActionSetup {


    constructor(private platform: Platform) {
        super();
    }

    override execute(ctx: Joinpoint, next?: () => void) {
        ctx.invokeHandle = (j, a) => this.invokeAdvice(j, a);
        super.execute(ctx, next);
    }


    beforeConstr(targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.getAction(ADVISOR).getAdvices(targetType, ctor);
        if (!advices) {
            return;
        }

        const joinPoint = Joinpoint.parse(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            name: ctor,
            state: JoinpointState.Before,
            advices,
            args,
            params,
            targetType,
            parent
        });
        this.execute(joinPoint);
    }

    afterConstr(target: any, targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.getAction(ADVISOR).getAdvices(targetType, ctor);
        if (!advices) {
            return;
        }

        const joinPoint = Joinpoint.parse(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            name: ctor,
            state: JoinpointState.After,
            advices,
            args,
            params,
            target,
            targetType,
            parent
        });
        this.execute(joinPoint);
    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     */
    proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        if (advices && pointcut) {
            const methodName = pointcut.name;
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                const getProxy = pointcut.descriptor.get ? this.proxy(pointcut.descriptor.get.bind(target) as Function, advices, target, targetType, pointcut, provJoinpoint) : emptyFunc;
                const setProxy = pointcut.descriptor.set ? this.proxy(pointcut.descriptor.set.bind(target) as Function, advices, target, targetType, pointcut, provJoinpoint) : emptyFunc;
                if (pointcut.descriptor.get && pointcut.descriptor.set) {
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return getProxy();
                        },
                        set: () => {
                            setProxy();
                        }
                    });
                } else if (pointcut.descriptor.get) {
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return getProxy();
                        }
                    });
                } else if (pointcut.descriptor.set) {
                    Object.defineProperty(target, methodName, {
                        set: () => {
                            setProxy();
                        }
                    });
                }
            } else if (isFunction(target[methodName]) && !target[methodName][proxyFlag]) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
                target[methodName][proxyFlag] = true;
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        const fullName = pointcut.fullName;
        const name = pointcut.name;
        const self = this;
        const platform = this.platform;
        return (...args: any[]) => {
            if (!platform || platform.destroyed) {
                return propertyMethod.call(target, ...args);
            }
            const larg = lang.last(args);
            let parent: InvocationContext | undefined;
            if (larg instanceof InvocationContext) {
                args = args.slice(0, args.length - 1);
                parent = larg;
            }
            const targetRef = refl.get(targetType);
            const joinPoint = Joinpoint.parse((parent || provJoinpoint)?.injector ?? platform.getInjector('root') ?? this.platform.getInjector('platform'), {
                name,
                fullName,
                params: targetRef.class.getParameters(name),
                args,
                target,
                targetType,
                advices,
                originMethod: propertyMethod,
                provJoinpoint,
                annotations: targetRef.class.decors.filter(d => d.propertyKey === name).map(d => d.metadata),
                parent
            });

            self.execute(joinPoint);
            let returning = joinPoint.returning;
            return returning;
        }
    }

    setup() {
        this.use(CtorAdvicesScope, MethodAdvicesScope);
    }

    protected invokeAdvice(joinPoint: Joinpoint, advicer: Advicer) {
        let metadata = advicer.advice as AroundMetadata;
        if (!isNil(joinPoint.args) && metadata.args) {
            joinPoint.setArgument(metadata.args, joinPoint.args);
        }

        if (metadata.annotationArgName) {
            if (metadata.annotationName) {
                let d: string = metadata.annotationName;
                d = d ? (aExp.test(d) ? d : `@${d}`) : '';
                joinPoint.setArgument(metadata.annotationArgName, joinPoint.annotations ? joinPoint.annotations.filter(v => v && d ? v.decorator = d : true) : []);
            } else {
                joinPoint.setArgument(metadata.annotationArgName, joinPoint.annotations ?? []);
            }
        }

        if (!isNil(joinPoint.returning) && metadata.returning) {
            joinPoint.setArgument(metadata.returning, joinPoint.returning);
        }

        if (joinPoint.throwing && metadata.throwing) {
            joinPoint.setArgument(metadata.throwing, joinPoint.throwing);
        }

        return joinPoint.injector.invoke(advicer.aspect, advicer.advice.propertyKey!, joinPoint);
    }

}


export class CtorAdvicesScope extends IocActions<Joinpoint> implements IActionSetup {

    override execute(ctx: Joinpoint, next?: () => void) {
        if (ctx.method === ctor) {
            super.execute(ctx);
        } else {
            next?.();
        }
    }

    setup() {
        this.use(CtorBeforeAdviceAction, CtorAfterAdviceAction);
    }
}

export const CtorBeforeAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.Before) {
        const invoker = ctx.invokeHandle;
        ctx.advices.Before.forEach(advicer => {
            invoker(ctx, advicer);
        });

        ctx.advices.Pointcut.forEach(advicer => {
            invoker(ctx, advicer);
        });

        ctx.advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
    }
    next();

}

const emptyFunc = function () { };

export const CtorAfterAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.After) {
        const invoker = ctx.invokeHandle;
        ctx.advices.After.forEach(advicer => {
            invoker(ctx, advicer);
        });

        ctx.advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
    }
    next();
}

export class MethodAdvicesScope extends IocActions<Joinpoint> implements IActionSetup {

    setup() {
        this.use(
            BeforeAdvicesAction,
            PointcutAdvicesAction,
            ExecuteOriginMethodAction,
            AfterAdvicesAction,
            AfterAsyncReturningAdvicesAction,
            AfterReturningAdvicesAction,
            AfterThrowingAdvicesAction
        );
    }

}


export const BeforeAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Before;
    const invoker = ctx.invokeHandle;
    ctx.advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });

    ctx.advices.Before.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const PointcutAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Pointcut;
    const invoker = ctx.invokeHandle;
    ctx.advices.Pointcut.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const ExecuteOriginMethodAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    try {
        const val = ctx.originMethod?.(...ctx.args || EMPTY);
        ctx.returning = val;
    } catch (err) {
        ctx.throwing = err as Error;
    }
    next();
}

export const AfterAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.After;
    const invoker = ctx.invokeHandle;
    ctx.advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    ctx.advices.After.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const AfterAsyncReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing || !isPromise(ctx.returning)) {
        return next();
    }

    ctx.state = JoinpointState.AfterReturning;
    const invoker = ctx.invokeHandle;
    let val: any;
    ctx.returning = lang.step([
        ctx.returning.then(v => { val = v; }),
        ...ctx.advices.Around.map(a => () => invoker(ctx, a)),
        ...ctx.advices.AfterReturning.map(a => () => invoker(ctx, a)),
        () => !isNil(ctx.resetReturning) ? ctx.resetReturning : val
    ])
        .then(v => {
            ctx.resetReturning = null;
            return v;
        })
        .catch(err => {
            ctx.throwing = err;
            next();
        });

}

export const AfterReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing || isPromise(ctx.returning)) {
        return next();
    }
    if (!isNil(ctx.returning)) {
        ctx.state = JoinpointState.AfterReturning;
        const invoker = ctx.invokeHandle;
        ctx.advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
        ctx.advices.AfterReturning.forEach(advicer => {
            invoker(ctx, advicer);
        });
        if (!isNil(ctx.resetReturning)) {
            ctx.returning = ctx.resetReturning;
            ctx.resetReturning = null;
        }
    }
}

export const AfterThrowingAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (!ctx.throwing) return next();

    ctx.state = JoinpointState.AfterThrowing;
    const invoker = ctx.invokeHandle;
    ctx.advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    ctx.advices.AfterThrowing.forEach(advicer => {
        invoker(ctx, advicer);
    });
}
