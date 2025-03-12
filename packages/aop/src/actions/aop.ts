import { Type, RuntimeContext, AnnotationType, Class, HandlerFn, Context } from '@tsdi/ioc';
import { ProceedingScope } from './proceed';
import { AopDef } from '../metadata/ref';
import { Advisor } from '../Advisor';


/**
 * execute bind method pointcut interecptor.
 */
export const bindMthPointcut = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    // aspect class do nothing.
    // ctx.type had checked.
    if (ctx.instance && isValAspectTag(ctx.type, ctx.class)) {
        context.get(Advisor).attach(ctx.class, ctx.instance);
    }

    return next(ctx, context)
};


/**
 * before constructor advice interecptor.
 *
 * @export
 */
export const beforeCtorAdvice = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    // aspect class do nothing.
    if (isValAspectTag(ctx.type, ctx.class)) {
        context.get(ProceedingScope)
            .beforeConstr(ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);
    }

    return next(ctx, context)
}

/**
 * after constructor advice interecptor.
 *
 * @export
 */
export const afterCtorAdvice = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    // aspect class do nothing.
    if (ctx.instance && isValAspectTag(ctx.type, ctx.class)) {
        context.get(ProceedingScope)
            .afterConstr(ctx.instance, ctx.type, ctx.params, ctx.args, ctx.injector, ctx.context);
    }

    return next(ctx, context)
}


/**
 *  match pointcut interecptor.
 *
 * @export
 */
export const matchPointcut = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    // aspect class do nothing.
    if (isValAspectTag(ctx.type, ctx.class)) {
        const advisor = context.get(Advisor);
        advisor.register(ctx.class);
    }

    return next(ctx, context)
}


/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
function isValAspectTag(targetType: Type, clas: Class): boolean {
    if ((targetType as AnnotationType).ƿNPT) {
        return false
    }
    return !clas.getAnnotation<AopDef>().nonePointcut
}
