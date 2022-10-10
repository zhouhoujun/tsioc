import { Type, RuntimeContext, AnnotationType } from '@tsdi/ioc';
import { ProceedingScope } from './proceed';
import { AopDef } from '../metadata/ref';
import { Advisor } from '../Advisor';


/**
 * execute bind method pointcut action.
 */
export const BindMthPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    // ctx.type had checked.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.def as AopDef)) {
        return next()
    }

    const platform = ctx.injector.platform();
    platform.getActionValue(Advisor).attach(ctx.def, ctx.instance);

    next()
};


/**
 * before constructor advice actions.
 *
 * @export
 */
export const BeforeCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValAspectTag(ctx.type, ctx.def as AopDef)) {
        return next()
    }

    ctx.injector.platform()
        .getAction(ProceedingScope)
        .beforeConstr(ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);

    next()
}

/**
 * after constructor advice actions.
 *
 * @export
 */
export const AfterCtorAdviceAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!ctx.instance || !isValAspectTag(ctx.type, ctx.def as AopDef)) {
        return next()
    }

    ctx.injector.platform()
        .getAction(ProceedingScope)
        .afterConstr(ctx.instance, ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);

    next()
}


/**
 *  match pointcut action.
 *
 * @export
 */
export const MatchPointcutAction = function (ctx: RuntimeContext, next: () => void): void {
    // aspect class do nothing.
    if (!isValAspectTag(ctx.type, ctx.def as AopDef)) {
        return next()
    }

    const platform = ctx.injector.platform();
    const advisor = platform.getActionValue(Advisor);
    advisor.register(ctx.def);

    next()
}


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
function isValAspectTag(targetType: Type, def: AopDef): boolean {
    if ((targetType as AnnotationType).ƿNPT) {
        return false
    }
    return !def.nonePointcut
}
