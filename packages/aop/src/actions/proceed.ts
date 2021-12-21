import {
    Type, isFunction, lang, Platform, isNil, isPromise, refl, ctorName, chain, ActionSetup,
    IocActions, ParameterMetadata, InvocationContext, Injector, object2string, isObservable, ObservableParser
} from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/state';
import { Advices } from '../advices/Advices';
import { Advicer } from '../advices/Advicer';
import { AroundMetadata } from '../metadata/meta';
import { Advisor } from '../Advisor';

const proxyFlag = '_proxy';
const aExp = /^@/;

/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope extends IocActions<Joinpoint> implements ActionSetup {


    constructor(private platform: Platform) {
        super();
    }

    override handle(ctx: Joinpoint, next?: () => void) {
        ctx.invokeHandle = (j, a, s) => this.invokeAdvice(j, a, s);
        super.handle(ctx, next);
    }


    beforeConstr(targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.getAction(Advisor).getAdvices(targetType, ctorName);
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
        this.handle(joinPoint);
    }

    afterConstr(target: any, targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined) {
        const advices = this.platform.getAction(Advisor).getAdvices(targetType, ctorName);
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
        this.handle(joinPoint);
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
                let propertyMethod = target[methodName];
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
            if (!platform || !platform.injector || platform.injector.destroyed) {
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

            self.handle(joinPoint);

            if (joinPoint.returningDefer) {
                return isObservable(joinPoint.originReturning) ? joinPoint.get(ObservableParser).fromPromise(joinPoint.returningDefer.promise) : joinPoint.returningDefer.promise;
            } else {
                return joinPoint.returning;
            }
        }
    }

    setup() {
        this.use(CtorAdvicesScope, MethodAdvicesScope);
    }

    protected invokeAdvice(joinPoint: Joinpoint, advicer: Advicer, sync?: boolean) {
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

        const injector = advicer.aspect.injector;
        if (injector) joinPoint.addRef(injector);
        let returning = joinPoint.injector.invoke(advicer.aspect, advicer.advice.propertyKey!, joinPoint);

        if (sync && isObservable(returning)) {
            const parser = joinPoint.get(ObservableParser);
            if (parser) {
                returning = parser.toPromise(returning);
            }
        }
        if (isPromise(returning)) {
            return returning.finally(() => injector && joinPoint.removeRef(injector));
        } else {
            injector && joinPoint.removeRef(injector);
            return returning;
        }
    }

}


export class CtorAdvicesScope extends IocActions<Joinpoint> implements ActionSetup {

    override handle(ctx: Joinpoint, next?: () => void) {
        if (ctx.method === ctorName) {
            super.handle(ctx);
        } else {
            next?.();
        }
    }

    setup() {
        this.use(CtorBeforeAdviceAction, CtorAfterAdviceAction);
    }
}

function runAdvicers(ctx: Joinpoint, invoker: (joinPoint: Joinpoint, advicer: Advicer, sync?: boolean) => any, advicers: Advicer[], next: () => void, sync: boolean | undefined) {
    if (sync) {
        if (!ctx.returningDefer) {
            ctx.returningDefer = lang.defer();
        }
        return Promise.all(advicers.map(a => invoker(ctx, a, sync)))
            .then(() => next())
            .catch(err => {
                ctx.throwing = err;
            });
    } else {
        try {
            advicers.forEach(advicer => {
                invoker(ctx, advicer);
            });
            return next();
        } catch (err) {
            ctx.throwing = err;
        }
    }
}

export const CtorBeforeAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.state === JoinpointState.Before) {
        const invoker = ctx.invokeHandle;
        chain<Joinpoint>([
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Before, anext, ctx.advices.syncBefore),
            (ctx, pnext) => runAdvicers(ctx, invoker, ctx.advices.Pointcut, pnext, ctx.advices.syncPointcut),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround)
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
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.After, anext, ctx.advices.syncAfter),
            (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround)
        ], ctx, next);
    } else {
        next();
    }
}

export class MethodAdvicesScope extends IocActions<Joinpoint> implements ActionSetup {

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
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, bnext) => runAdvicers(ctx, invoker, ctx.advices.Before, bnext, ctx.advices.syncBefore)
    ], ctx, next);
}

export const PointcutAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.state = JoinpointState.Pointcut;
    runAdvicers(ctx, ctx.invokeHandle, ctx.advices.Pointcut, next, ctx.advices.syncPointcut);
}

export const ExecuteOriginMethodAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    try {
        if (ctx.originProxy) {
            ctx.returning = ctx.originProxy(ctx);
        } else {
            ctx.returning = ctx.originMethod?.apply(ctx.target, ctx.args);
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
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.After, anext, ctx.advices.syncAfter)
    ], ctx, next);
}


export const AfterReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }

    ctx.state = JoinpointState.AfterReturning;
    const invoker = ctx.invokeHandle;
    let isAsync = false;
    let returning = ctx.returning;
    const orgReturning = (ctx as any).originReturning = returning;
    const parser = ctx.get(ObservableParser);
    if (isPromise(returning)) {
        isAsync = true;
    } else if (parser && isObservable(returning)) {
        isAsync = true;
        returning = parser.toPromise(returning);
    }
    if (isAsync && !ctx.returningDefer) {
        ctx.returningDefer = lang.defer();
    }

    chain<Joinpoint, any>([
        (ctx, rnext) => isAsync ?
            (returning as Promise<any>).then(val => {
                return (rnext() as Promise<any>)
                    .then(() => {
                        if (orgReturning !== ctx.returning) {
                            return ctx.returning;
                        }
                        return val;
                    })
                    .then(r => {
                        ctx.returningDefer?.resolve(r)
                    })
            }).catch(err => {
                ctx.throwing = err;
                next();
            }) : rnext()
        ,
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround || isAsync),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterReturning, anext, ctx.advices.syncAfterReturning || isAsync),
        (ctx, anext) => isAsync ? anext() : ctx.returningDefer?.resolve(ctx.returning)
    ], ctx);

}

export const AfterThrowingAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (!ctx.throwing) return next();

    ctx.state = JoinpointState.AfterThrowing;
    const invoker = ctx.invokeHandle;
    chain<Joinpoint>([
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.Around, anext, ctx.advices.syncAround),
        (ctx, anext) => runAdvicers(ctx, invoker, ctx.advices.AfterThrowing, anext, ctx.advices.syncAfterThrowing)
    ], ctx, () => {
        ctx.returningDefer?.reject(ctx.throwing);
    });
}
