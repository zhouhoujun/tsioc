import { Joinpoint, AOP_THROWING, AOP_RETURNING, AOP_STATE } from '../joinpoints/Joinpoint';
import { IocCompositeAction, IActionSetup, isPromise, PromiseUtil } from '@tsdi/ioc';
import { JoinpointState } from '../joinpoints/JoinpointState';
import { AOP_ADVICE_INVOKER } from './ProceedingScope';




export class MethodAdvicesScope extends IocCompositeAction<Joinpoint> implements IActionSetup {

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

export const AfterAsyncReturningAdvicesAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.throwing || !isPromise(ctx.returning)) {
        return next();
    }

    ctx.setValue(AOP_STATE, JoinpointState.AfterReturning);
    let advices = ctx.advices;
    let invoker = ctx.getValue(AOP_ADVICE_INVOKER);
    ctx.setValue(AOP_RETURNING, PromiseUtil.step([
        ctx.returning,
        ...advices.Around.map(a => () => invoker(ctx, a)),
        ...advices.AfterReturning.map(a => () => invoker(ctx, a)),
        ctx.returning
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
