import {
    Type, isFunction, lang, Platform, isNil, isPromise, refl, ctorName,
    ParameterMetadata, InvocationContext, Injector, object2string, isObservable,
    LifeScope,
    HandlerFn,
    InterceptorLike,
    InterceptorChina,
    Context,
    Handler,
    toHandlerFn
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';
import { AroundMetadata } from '../metadata/meta';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';
import { from, lastValueFrom } from 'rxjs';

const proxyFlag = '_proxy';
const aExp = /^@/;

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope extends InterceptorChina<Joinpoint> implements Proceeding {

    constructor(
        readonly platform: Platform,
        interceptors: InterceptorLike<Joinpoint>[]) {
        super(interceptors)
    }

    // override intercept(ctx: Joinpoint, next: Handler<Joinpoint>, context: Context) {
    //     super.intercept(ctx, next)
    // }


    beforeConstr(targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.context.get(Advisor).getAdvices(targetType, ctorName);
        if (!advices) {
            return
        }

        const joinPoint = Joinpoint.create(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            targetType: targetType,
            methodName: ctorName,
            state: JoinpointState.Before,
            advices,
            args,
            params,
            parent
        });
        this.handle(joinPoint)
    }

    afterConstr(target: any, targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.context.get(Advisor).getAdvices(targetType, ctorName);
        if (!advices) {
            return
        }

        const joinPoint = Joinpoint.create(injector ?? this.platform.getInjector('root') ?? this.platform.getInjector('platform'), {
            targetType: targetType,
            methodName: ctorName,
            state: JoinpointState.After,
            advices,
            args,
            params,
            target,
            parent
        });
        this.handle(joinPoint)
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
                if (pointcut.descriptor.get) {
                    const getProxy = this.proxy(pointcut.descriptor.get.bind(target), advices, target, targetType, pointcut);
                    Object.defineProperty(target, methodName, {
                        get: () => {
                            return getProxy()
                        }
                    })
                }
                if (pointcut.descriptor.set) {
                    const setProxy = this.proxy(pointcut.descriptor.set.bind(target), advices, target, targetType, pointcut);
                    Object.defineProperty(target, methodName, {
                        set: (val) => {
                            setProxy(val)
                        }
                    })
                }
            } else if (isFunction(target[methodName]) && !target[methodName][proxyFlag]) {
                const propertyMethod = target[methodName];
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut);
                target[methodName][proxyFlag] = true
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type, pointcut: IPointcut) {
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
            const targetRef = refl.get(targetType);
            const joinPoint = Joinpoint.create(parent?.injector ?? platform.getInjector('root') ?? this.platform.getInjector('platform'), {
                targetType: targetType,
                methodName: name,
                fullName,
                params: targetRef.getParameters(name),
                args,
                target,
                advices,
                originMethod: propertyMethod,
                annotations: targetRef.defs.filter(d => d.propertyKey === name),
                parent
            });
            if (parent) {
                joinPoint.onDestroy(parent)
            }

            this.intercept(joinPoint, { handle: originMethodHandler }, platform.context);

            return joinPoint.returning;

            // if (joinPoint.returningDefer) {
            //     return isObservable(joinPoint.originReturning) ?
            //         from(joinPoint.returningDefer.promise)
            //         : joinPoint.returningDefer.promise
            // } else {
            //     if (joinPoint.throwing) {
            //         throw joinPoint.throwing;
            //     }
            //     return joinPoint.returning
            // }
        }
    }

    // setup() {
    //     this.use(CtorAdvicesScope, MethodAdvicesScope)
    // }

}

export const originMethodHandler = (ctx: Joinpoint, context: Context) => {
    try {
        if (ctx.originProxy) {
            ctx.returning = ctx.originProxy(ctx)
        } else {
            ctx.returning = ctx.originMethod?.apply(ctx.target, ctx.args)
        }
    } catch (err) {
        ctx.throwing = err as Error
    }
    return ctx.returning;
}

function invokeAdvice(joinPoint: Joinpoint, advicer: Advicer, sync?: boolean) {
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

    const context = advicer.aspect.getContext();
    if (context) {
        joinPoint.addRef(context)
    }

    let returning = advicer.aspect.invoke(advicer.advice.name!, joinPoint);

    if (isObservable(returning)) {
        returning = lastValueFrom(returning)
    }
    if (isPromise(returning)) {
        return returning.finally(() => context && joinPoint.removeRef(context))
    } else {
        context && joinPoint.removeRef(context);
        return returning
    }
}


export class CtorAdvicesScope extends InterceptorChina<Joinpoint> {

    constructor(interceptors: InterceptorLike<Joinpoint>[] = [CtorBeforeAdviceAction, CtorAfterAdviceAction]) {
        super(interceptors)
    }
    override intercept(ctx: Joinpoint, next: Handler, context: Context) {
        if (ctx.methodName === ctorName) {
            return this.getChain()(ctx, toHandlerFn(next), context)
        } else {
            return next.handle(ctx, context)
        }
    }
}

function runAdvicers(ctx: Joinpoint, invoker: (joinPoint: Joinpoint, advicer: Advicer, sync?: boolean) => any, advicers: Advicer[], next: () => void, sync: boolean | undefined) {
    if (sync) {
        if (!ctx.returningDefer) {
            ctx.returningDefer = lang.defer()
        }
        return lang.step(advicers.map(a => () => invoker(ctx, a, sync)))
            .then(() => next())
            .catch(err => {
                ctx.throwing = err;
            })
    } else {
        try {
            advicers.forEach(advicer => {
                invoker(ctx, advicer)
            });
            return next()
        } catch (err) {
            ctx.throwing = err
        }
    }
}

export const CtorBeforeAdviceAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.state === JoinpointState.Before) {
        runChain<Joinpoint>([
            (ctx, bnext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Before, bnext, ctx.advices.syncBefore),
            (ctx, pnext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Pointcut, pnext, ctx.advices.syncPointcut),
            (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Around, anext, ctx.advices.syncAround)
        ], ctx, next)
    } else {
        next()
    }

}

export const CtorAfterAdviceAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.state === JoinpointState.After) {
        runChain<Joinpoint>([
            (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.After, anext, ctx.advices.syncAfter),
            (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Around, anext, ctx.advices.syncAround)
        ], ctx, next)
    } else {
        next()
    }
}

const methodAdvicesInterceptors: InterceptorLike<Joinpoint>[] = [
    BeforeAdvicesAction,
    PointcutAdvicesAction,
    ExecuteOriginMethodAction,
    AfterAdvicesAction,
    AfterReturningAdvicesAction,
    AfterThrowingAdvicesAction
];

export class MethodAdvicesScope extends InterceptorChina<Joinpoint> {
    constructor(interceptors: InterceptorLike<Joinpoint>[] = methodAdvicesInterceptors) {
        super(interceptors)
    }
}


export const BeforeAdvicesAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.throwing) {
        return next()
    }
    ctx.state = JoinpointState.Before;

    runChain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, bnext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Before, bnext, ctx.advices.syncBefore)
    ], ctx, next)
}

export const PointcutAdvicesAction = function (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.throwing) {
        return next()
    }
    ctx.state = JoinpointState.Pointcut;
    runAdvicers(ctx, ctx.invokeHandle, ctx.advices.Pointcut, next, ctx.advices.syncPointcut)
}

export const ExecuteOriginMethodAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.throwing) {
        return next()
    }
    try {
        if (ctx.originProxy) {
            ctx.returning = ctx.originProxy(ctx)
        } else {
            ctx.returning = ctx.originMethod?.apply(ctx.target, ctx.args)
        }
    } catch (err) {
        ctx.throwing = err as Error
    }

    next()
}

export const AfterAdvicesAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.throwing) {
        return next()
    }
    ctx.state = JoinpointState.After;

    runChain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, anext) => runAdvicers(ctx, invokeAdvice, ctx.advices.After, anext, ctx.advices.syncAfter)
    ], ctx, next)
}


export const AfterReturningAdvicesAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (ctx.throwing) {
        return next()
    }

    ctx.state = JoinpointState.AfterReturning;
    const invoker = ctx.invokeHandle;
    let isAsync = false;
    let returning = ctx.returning;
    const orgReturning = (ctx as any).originReturning = returning;

    if (isPromise(returning)) {
        isAsync = true
    } else if (isObservable(returning)) {
        isAsync = true;
        returning = lastValueFrom(returning)
    }
    if (isAsync && !ctx.returningDefer) {
        ctx.returningDefer = lang.defer()
    }

    runChain<Joinpoint, any>([
        (ctx, rnext) => isAsync ?
            (returning as Promise<any>).then(val => {
                return (rnext() as Promise<any>)
                    .then(() => {
                        if (orgReturning !== ctx.returning) {
                            return ctx.returning
                        }
                        return val
                    })
                    .then(r => {
                        ctx.returningDefer?.resolve(r)
                    })
            }).catch(err => {
                ctx.throwing = err;
                next()
            }) : rnext()
        ,
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround || isAsync),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterReturning, anext, ctx.advices.syncAfterReturning || isAsync),
        (ctx, anext) => isAsync ? anext() : ctx.returningDefer?.resolve(ctx.returning)
    ], ctx)

}

export const AfterThrowingAdvicesAction = (ctx: Joinpoint, next: HandlerFn, context: Context) => {
    if (!ctx.throwing) return next();

    ctx.state = JoinpointState.AfterThrowing;
    const invoker = ctx.invokeHandle;
    runChain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterThrowing, anext, ctx.advices.syncAfterThrowing)
    ], ctx, () => {
        ctx.returningDefer?.reject(ctx.throwing)
    })
}
