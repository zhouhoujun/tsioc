import { Joinpoint, AOP_THROWING, AOP_RETURNING, AOP_STATE } from '../joinpoints/Joinpoint';
import { IocCompositeAction, IActionSetup, isDefined, isArray, tokenId, isPromise, PromiseUtil, TypeReflectsToken, INJECTOR, ITypeReflects } from '@tsdi/ioc';
import { JoinpointState } from '../joinpoints/JoinpointState';
import { Advicer } from '../advices/Advicer';
import { aExp } from '../regexps';


const AOP_ADVICE_INVOKER = tokenId<(joinPoint: Joinpoint, advicer: Advicer) => any>('AOP_ADVICE_INVOKER');

export class MethodAdvicesScope extends IocCompositeAction<Joinpoint> implements IActionSetup {

    execute(ctx: Joinpoint, next?: () => void) {
        ctx.providers.inject(...ctx.getProvProviders());
        let reflects = ctx.reflects;
        ctx.setValue(AOP_ADVICE_INVOKER, (j, a) => this.invokeAdvice(j, a, reflects));
        super.execute(ctx, next);
    }
    setup() {
        this.use(BeforeAdvicesAction)
            .use(PointcutAdvicesAction)
            .use(ExecuteOriginMethodAction)
            .use(AfterAdvicesAction)
            .use(AfterSyncReturningAdvicesAction)
            .use(AfterReturningAdvicesAction)
            .use(AfterThrowingAdvicesAction);
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

        if (joinPoint.hasValue(AOP_RETURNING) && metadata.returning) {
            providers.inject({ provide: metadata.returning, useValue: joinPoint.returning })
        }

        if (joinPoint.throwing && metadata.throwing) {
            providers.inject({ provide: metadata.throwing, useValue: joinPoint.throwing });
        }
        return reflects.getInjector(advicer.aspectType).invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
    }

}


export const BeforeAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.setValue(AOP_STATE, JoinpointState.Before);

    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
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
    ctx.setValue(AOP_STATE, JoinpointState.Pointcut);
    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
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
        ctx.setValue(AOP_RETURNING, val);
    } catch (err) {
        ctx.setValue(AOP_THROWING, err);
    }
    next();
}

export const AfterAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    ctx.setValue(AOP_STATE, JoinpointState.After);
    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
    advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    advices.After.forEach(advicer => {
        invoker(ctx, advicer);
    });
    next();
}

export const AfterSyncReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing || !isPromise(ctx.returning)) {
        return next();
    }

    ctx.setValue(AOP_STATE, JoinpointState.AfterReturning);
    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
    let asyncRt = ctx.returning;
    ctx.setValue(AOP_RETURNING, PromiseUtil.step([
        asyncRt,
        ...advices.Around.map(a => () => invoker(ctx, a)),
        ...advices.AfterReturning.map(a => () => invoker(ctx, a))
    ]));

}

export const AfterReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        return next();
    }
    if (ctx.hasValue(AOP_RETURNING)) {
        ctx.setValue(AOP_STATE, JoinpointState.AfterReturning);
        let advices = ctx.advices;
        let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
        advices.Around.forEach(advicer => {
            invoker(ctx, advicer);
        });
        advices.AfterReturning.forEach(advicer => {
            invoker(ctx, advicer);
        });
    }
}

export const AfterThrowingAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing) {
        ctx.setValue(AOP_STATE, JoinpointState.AfterThrowing);
    }
    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
    advices.Around.forEach(advicer => {
        invoker(ctx, advicer);
    });
    advices.AfterThrowing.forEach(advicer => {
        invoker(ctx, advicer);
    });
}
