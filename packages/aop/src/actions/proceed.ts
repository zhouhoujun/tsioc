import {
    Type, isFunction, lang, Platform, isNil, isPromise, refl, EMPTY, ctorName, IActionSetup,
    IocActions, ParameterMetadata, InvocationContext, Injector, chain, object2string
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';
import { ADVISOR } from '../metadata/tk';
import { AroundMetadata } from '../metadata/meta';

const proxyFlag = '_proxy';
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
        const advices = this.platform.getAction(ADVISOR).getAdvices(targetType, ctorName);
        if (!advices) {
            return;
        }

        const joinPoint = Joinpoint.parse(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            name: ctorName,
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
        const advices = this.platform.getAction(ADVISOR).getAdvices(targetType, ctorName);
        if (!advices) {
            return;
        }

        const joinPoint = Joinpoint.parse(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            name: ctorName,
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
    proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut) {
        if (advices && pointcut) {
            const methodName = pointcut.name;
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                const getProxy = pointcut.descriptor.get ? this.proxy(pointcut.descriptor.get.bind(target) as Function, advices, target, targetType, pointcut) : emptyFunc;
                const setProxy = pointcut.descriptor.set ? this.proxy(pointcut.descriptor.set.bind(target) as Function, advices, target, targetType, pointcut) : emptyFunc;
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
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut);
                target[methodName][proxyFlag] = true;
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type, pointcut: IPointcut) {
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
            const joinPoint = Joinpoint.parse(parent?.injector ?? platform.getInjector('root') ?? this.platform.getInjector('platform'), {
                name,
                fullName,
                params: targetRef.class.getParameters(name),
                args,
                target,
                targetType,
                advices,
                originMethod: propertyMethod,
                annotations: targetRef.class.decors.filter(d => d.propertyKey === name),
                parent
            });
            if (parent) {
                joinPoint.onDestroy(parent);
            }

            self.execute(joinPoint);
            let returning = joinPoint.returning;
            return returning;
        }
    }

    setup() {
        this.use(CtorAdvicesScope, MethodAdvicesScope);
    }

    protected invokeAdvice(joinPoint: Joinpoint, advicer: Advicer) {
        if (joinPoint.destroyed) {
            throw new Error(`joinPoint is destroyed, when invoked advicer ${object2string(advicer)}.\n\njoinPoint object ${object2string(joinPoint, { fun: false, typeInst: true })}`);
        }
        const metadata = advicer.advice as AroundMetadata;
        if (!isNil(joinPoint.args) && metadata.args) {
            joinPoint.setArgument(metadata.args, joinPoint.args);
        }

        if (metadata.annotationArgName) {
            if (metadata.annotationName) {
                let d: string = metadata.annotationName;
                d = d ? (aExp.test(d) ? d : `@${d}`) : '';
                joinPoint.setArgument(metadata.annotationArgName, joinPoint.annotations ? joinPoint.annotations.filter(v => v && v.decor == d).map(d => d.metadata) : []);
            } else {
                joinPoint.setArgument(metadata.annotationArgName, joinPoint.annotations?.map(d => d.metadata) ?? []);
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
        if (ctx.method === ctorName) {
            super.execute(ctx);
        } else {
            next?.();
        }
    }

    setup() {
        this.use(CtorBeforeAdviceAction, CtorAfterAdviceAction);
    }
}

function runAdvicers(ctx: Joinpoint, invoker: (joinPoint: Joinpoint, advicer: Advicer) => any, advicers: Advicer[], next: () => void, async: boolean | undefined) {
    if (async) {
        return lang.step(advicers.map(a => () => invoker(ctx, a)))
            .then(() => {
                next();
            });
    } else {
        advicers.forEach(advicer => {
            invoker(ctx, advicer);
        });
        next();
    }
}

export const CtorBeforeAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.Before) {
        const invoker = ctx.invokeHandle;
        chain<Joinpoint>([
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Before, anext, ctx.advices.asyncBefore),
            (ctx, pnext) => runAdvicers(ctx, invoker, ctx.advices.Pointcut, pnext, ctx.advices.asyncPointcut),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround)
        ], ctx, next)
    } else {
        next();
    }

}

const emptyFunc = function () { };

export const CtorAfterAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.After) {
        const invoker = ctx.invokeHandle;
        chain<Joinpoint>([
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.After, anext, ctx.advices.asyncAfter),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround)
        ], ctx, next);
    } else {
        next();
    }
}

export class MethodAdvicesScope extends IocActions<Joinpoint> implements IActionSetup {

    setup() {
        this.use(
            BeforeAdvicesAction,
            PointcutAdvicesAction,
            ExecuteOriginMethodAction,
            AfterAdvicesAction,
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

    chain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround),
        (ctx, bnext) => runAdvicers(ctx, invoker, ctx.advices.Before, bnext, ctx.advices.asyncBefore)
    ], ctx, next);
}

export const PointcutAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Pointcut;
    runAdvicers(ctx, ctx.invokeHandle, ctx.advices.Pointcut, next, ctx.advices.asyncPointcut);
}

export const ExecuteOriginMethodAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    try {
        if (ctx.originProxy) {
            ctx.originProxy(ctx);
        } else {
            ctx.returning = ctx.originMethod?.(...ctx.args || EMPTY);
        }
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

    chain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.After, anext, ctx.advices.asyncAfter)
    ], ctx, next);
}


export const AfterReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    if (!isNil(ctx.returning)) {
        ctx.state = JoinpointState.AfterReturning;
        const invoker = ctx.invokeHandle;
        const isAsync = isPromise(ctx.returning);

        chain<Joinpoint, any>([
            (ctx, rnext) => isAsync ?
                (ctx.returning as Promise<any>).then(val => {
                    return (rnext() as Promise<any>)
                        .then(() => {
                            const restVal = ctx.resetReturning;
                            ctx.resetReturning = null;
                            return restVal ?? val;
                        });
                }).catch(err => {
                    ctx.throwing = err;
                    next();
                }) : rnext(),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround || isAsync),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterReturning, anext, ctx.advices.asyncAfterReturning || isAsync)
        ], ctx, () => {
            if (!isNil(ctx.resetReturning)) {
                ctx.returning = ctx.resetReturning;
                ctx.resetReturning = null;
            }
        });
    }
}

export const AfterThrowingAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (!ctx.throwing) return next();

    ctx.state = JoinpointState.AfterThrowing;
    const invoker = ctx.invokeHandle;
    chain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.asyncAround),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterThrowing, anext, ctx.advices.asyncAfterThrowing)
    ], ctx);
}
