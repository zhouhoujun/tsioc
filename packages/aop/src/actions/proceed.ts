import {
    Type, isFunction, lang, IProvider, ParameterMetadata, IContainer, IActionProvider, InvokedProvider,
    IocActions, IActionSetup, isArray, isNil, isPromise, refl
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';
import { aExp } from '../regexps';
import { ADVISOR } from '../tk';

const proxyFlag = '_proxy';
const ctor = 'constructor';

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope extends IocActions<Joinpoint> implements IActionSetup {

    private container: IContainer;

    constructor(private provider: IActionProvider) {
        super();
        this.container = provider.getContainer();
    }

    execute(ctx: Joinpoint, next?: () => void) {
        ctx.invokeHandle = (j, a) => this.invokeAdvice(j, a);
        super.execute(ctx, next);
    }


    beforeConstr(targetType: Type, params: ParameterMetadata[], args: any[], providers: IProvider) {
        const advices = this.provider.getInstance(ADVISOR).getAdvices(targetType, ctor);
        if (!advices) {
            return;
        }

        const fullName = lang.getClassName(targetType) + '.' + ctor;
        const joinPoint = Joinpoint.parse(this.container.state().getInjector(targetType), {
            name: ctor,
            state: JoinpointState.Before,
            advices,
            fullName,
            args,
            params,
            targetType,
            providers: providers
        });
        this.execute(joinPoint);
    }

    afterConstr(target: any, targetType: Type, params: ParameterMetadata[], args: any[], providers: IProvider) {
        const advices = this.provider.getInstance(ADVISOR).getAdvices(targetType, ctor);
        if (!advices) {
            return;
        }

        const fullName = lang.getClassName(targetType) + '.' + ctor;
        const joinPoint = Joinpoint.parse(this.container.state().getInjector(targetType), {
            name: ctor,
            state: JoinpointState.After,
            advices,
            fullName,
            args,
            params,
            target,
            targetType,
            providers
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
                if (pointcut.descriptor.get && pointcut.descriptor.set) {
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return this.proxy(pointcut.descriptor.get.bind(target), advices, target, targetType, pointcut, provJoinpoint)();
                        },
                        set: () => {
                            this.proxy(pointcut.descriptor.set.bind(target), advices, target, targetType, pointcut, provJoinpoint)();
                        }
                    });
                } else if (pointcut.descriptor.get) {
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return this.proxy(pointcut.descriptor.get.bind(target), advices, target, targetType, pointcut, provJoinpoint)();
                        }
                    });
                } else if (pointcut.descriptor.set) {
                    Object.defineProperty(target, methodName, {
                        set: () => {
                            this.proxy(pointcut.descriptor.set.bind(target), advices, target, targetType, pointcut, provJoinpoint)();
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
        const container = this.container;
        return (...args: any[]) => {
            const larg = lang.last(args);
            let providers: IProvider;
            if (larg instanceof InvokedProvider) {
                args = args.slice(0, args.length - 1);
                providers = larg;
            }
            const joinPoint = Joinpoint.parse(container.state().getInjector(targetType), {
                name,
                fullName,
                params: refl.getParameters(targetType, name),
                args,
                target,
                targetType,
                advices,
                originMethod: propertyMethod,
                provJoinpoint,
                annotations: refl.get(targetType).class.decors.filter(d => d.propertyKey === name).map(d => d.matedata),
                providers
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
        let metadata: any = advicer.advice;
        let providers = joinPoint.providers;
        if (!isNil(joinPoint.args) && metadata.args) {
            providers.inject({ provide: metadata.args, useValue: joinPoint.args })
        }

        if (metadata.annotationArgName) {
            providers.inject({
                provide: metadata.annotationArgName,
                useFactory: () => {
                    let curj = joinPoint;
                    let annotations = curj.annotations;

                    if (isArray(annotations)) {
                        if (metadata.annotationName) {
                            let d: string = metadata.annotationName;
                            d = aExp.test(d) ? d : `@${d}`;
                            return annotations.filter(a => a.decorator === d);
                        }
                        return annotations;
                    } else {
                        return [];
                    }
                }
            });
        }

        if (!isNil(joinPoint.returning) && metadata.returning) {
            providers.inject({ provide: metadata.returning, useValue: joinPoint.returning })
        }

        if (joinPoint.throwing && metadata.throwing) {
            providers.inject({ provide: metadata.throwing, useValue: joinPoint.throwing });
        }

        return this.container.state().getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
    }

}


export class CtorAdvicesScope extends IocActions<Joinpoint> implements IActionSetup {
    execute(ctx: Joinpoint, next?: () => void) {
        if (ctx.name === ctor) {
            super.execute(ctx);
        } else {
            next();
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

    execute(ctx: Joinpoint, next?: () => void) {
        ctx.providers.inject(...ctx.getProvProviders());
        super.execute(ctx, next);
    }
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
        const val = ctx.originMethod(...ctx.args);
        ctx.returning = val;
    } catch (err) {
        ctx.throwing = err;
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
    let val;
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
