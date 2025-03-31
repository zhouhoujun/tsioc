import { Type, RuntimeContext, AnnotationType, Class, HandlerFn, Context } from '@tsdi/ioc';
import { AopDef } from '../metadata/ref';
import { Advisor } from '../Advisor';
import { Proceeding } from '../Proceeding';



/**
 * advice interecptor.
 *
 * @export
 */
export const ctorAdvice = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    if (!isValAspectTag(ctx.type, ctx.class) || !context.has(Proceeding)) return next(ctx, context);

    // aspect class do nothing.
    return context.get(Proceeding).pointcut(ctx, next, context);

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
        advisor?.register(ctx.class);
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
