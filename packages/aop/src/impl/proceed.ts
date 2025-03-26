import {
    Type, isFunction, lang, Platform, refl, ctorName,
    InvocationContext, LifeScope, HandlerFn, Context, ContextToken, invokeTail,
    InterceptorChina, toHandler, RuntimeContext, InterceptorLike, isDefined
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { JoinPoint } from '../joinpoints/JoinPoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';

const proxyFlag = '_proxy';

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


    pointcutConstr(ctx: RuntimeContext, next: HandlerFn, context: Context) {
        const targetType = ctx.type;
        const advices = this.platform.context.get(Advisor).getAdvices(targetType, ctorName);
        if (!advices) {
            return next(ctx, context);
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
            const instance = joinPoint.returning = joinPoint.target = ctx.instance;
            return instance;
        })), this.platform.context);
    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {JoinPoint} [provJoinpoint]
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
            const joinPoint = JoinPoint.create(parent?.injector ?? platform.getInjector('root') ?? this.platform.getInjector('platform'), {
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

            return getMethodAdvicesScope(platform).handle(joinPoint, platform.context, (res) => joinPoint.returning);
        }
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
