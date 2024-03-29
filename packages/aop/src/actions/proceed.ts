import {
    Type, isFunction, lang, IProvider, InvokedProvider, ITypeReflects, TypeReflectsToken, IocActions,
    IParameter, IActionSetup, isArray, isDefined, isPromise, PromiseUtil
} from '@tsdi/ioc';
import { Advices } from '../advices/Advices';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { aExp } from '../regexps';
import { Advicer } from '../advices/Advicer';
import { AdvisorToken } from '../tk';

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

    execute(ctx: Joinpoint, next?: () => void) {
        ctx.invokeHandle = (j, a) => this.invokeAdvice(j, a, this.reflects);
        super.execute(ctx, next);
    }

    private _reflects: ITypeReflects;
    get reflects(): ITypeReflects {
        if (!this._reflects) {
            this._reflects = this.actInjector.getInstance(TypeReflectsToken);
        }
        return this._reflects;
    }

    beforeConstr(targetType: Type, params: IParameter[], args: any[], providers: IProvider) {
        let propertykey = ctor;
        let advices = this.actInjector.getInstance(AdvisorToken).getAdvices(targetType, propertykey);
        if (!advices) {
            return;
        }

        let className = lang.getClassName(targetType);
        let joinPoint = Joinpoint.parse(this.reflects.getInjector(targetType), {
            name: ctor,
            state: JoinpointState.Before,
            advices: advices,
            fullName: className + '.' + ctor,
            args: args,
            params: params,
            targetType: targetType,
            providers: providers
        });
        this.execute(joinPoint);
    }

    afterConstr(target: any, targetType: Type, params: IParameter[], args: any[], providers: IProvider) {
        let propertykey = ctor;
        let advices = this.actInjector.getInstance(AdvisorToken).getAdvices(targetType, propertykey);
        if (!advices) {
            return;
        }

        let className = lang.getClassName(targetType);
        let joinPoint = Joinpoint.parse(this.reflects.getInjector(targetType), {
            name: ctor,
            state: JoinpointState.After,
            advices: advices,
            fullName: className + '.' + ctor,
            args: args,
            params: params,
            target: target,
            targetType: targetType,
            providers: providers
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
     * @memberof ProxyMethod
     */
    proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let methodName = pointcut.name;
        if (advices && pointcut) {
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
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let reflects = this.reflects;
        let self = this;
        return (...args: any[]) => {
            let larg = lang.last(args);
            let cuurPrd: IProvider = null;
            if (larg instanceof InvokedProvider) {
                args = args.slice(0, args.length - 1);
                cuurPrd = larg;
            }
            let joinPoint = Joinpoint.parse(reflects.getInjector(targetType), {
                name: methodName,
                fullName: fullName,
                params: reflects.getParameters(targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType,
                advices: advices,
                originMethod: propertyMethod,
                provJoinpoint: provJoinpoint,
                annotations: reflects.getMetadatas(targetType, methodName, 'method'),
                providers: cuurPrd
            });

            self.execute(joinPoint);
            let returning = joinPoint.returning;
            return returning;
        }
    }

    setup() {
        this.use(CtorAdvicesScope)
            .use(MethodAdvicesScope);
    }

    protected invokeAdvice(joinPoint: Joinpoint, advicer: Advicer, reflects: ITypeReflects) {
        let metadata: any = advicer.advice;
        let providers = joinPoint.providers;
        if (isDefined(joinPoint.args) && metadata.args) {
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

        if (isDefined(joinPoint.returning) && metadata.returning) {
            providers.inject({ provide: metadata.returning, useValue: joinPoint.returning })
        }

        if (joinPoint.throwing && metadata.throwing) {
            providers.inject({ provide: metadata.throwing, useValue: joinPoint.throwing });
        }
        return reflects.getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
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
        this.use(CtorBeforeAdviceAction)
            .use(CtorAfterAdviceAction);
    }
}

export const CtorBeforeAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.Before) {
        const advices = ctx.advices;
        const invoker = ctx.invokeHandle;
        advices.Before.forEach(advicer => {
            invoker(ctx, advicer);
        });

        advices.Pointcut.forEach(advicer => {
            invoker(ctx, advicer);
        });

        advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
    }
    next();

}


export const CtorAfterAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.After) {
        const advices = ctx.advices;
        const invoker = ctx.invokeHandle;
        advices.After.forEach(advicer => {
            invoker(ctx, advicer);
        });

        advices.Around.forEach(advicer => {
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
        this.use(BeforeAdvicesAction)
            .use(PointcutAdvicesAction)
            .use(ExecuteOriginMethodAction)
            .use(AfterAdvicesAction)
            .use(AfterAsyncReturningAdvicesAction)
            .use(AfterReturningAdvicesAction)
            .use(AfterThrowingAdvicesAction);
    }

}


export const BeforeAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Before;
    const advices = ctx.advices;
    const invoker = ctx.invokeHandle;
    advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });

    advices.Before.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const PointcutAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Pointcut;
    const advices = ctx.advices;
    const invoker = ctx.invokeHandle;
    advices.Pointcut.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const ExecuteOriginMethodAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    try {
        let val = ctx.originMethod(...ctx.args);
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
    const advices = ctx.advices;
    const invoker = ctx.invokeHandle;
    advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    advices.After.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const AfterAsyncReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing || !isPromise(ctx.returning)) {
        return next();
    }

    ctx.state = JoinpointState.AfterReturning;
    const advices = ctx.advices;
    const invoker = ctx.invokeHandle;
    let val;
    ctx.returning = PromiseUtil.step([
        ctx.returning.then(v => { val = v; }),
        ...advices.Around.map(a => () => invoker(ctx, a)),
        ...advices.AfterReturning.map(a => () => invoker(ctx, a)),
        () => isDefined(ctx.resetReturning) ? ctx.resetReturning : val
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
    if (isDefined(ctx.returning)) {
        ctx.state = JoinpointState.AfterReturning;
        const advices = ctx.advices;
        const invoker = ctx.invokeHandle;
        advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
        advices.AfterReturning.forEach(advicer => {
            invoker(ctx, advicer);
        });
        if (isDefined(ctx.resetReturning)) {
            ctx.returning = ctx.resetReturning;
            ctx.resetReturning = null;
        }
    }
}

export const AfterThrowingAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (!ctx.throwing) return next();
    console.error(ctx.throwing);
    ctx.state = JoinpointState.AfterThrowing;
    const advices = ctx.advices;
    const invoker = ctx.invokeHandle;
    advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    advices.AfterThrowing.forEach(advicer => {
        invoker(ctx, advicer);
    });
}
