import { Type, RuntimeContext, AnnotationType, HandlerFn, Context, noPointcut } from '@tsdi/ioc';
import { Proceeding } from '../Proceeding';



/**
 * pointcut interecptor.
 *
 * @export
 */
export const pointcutInterceptor = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    if (!isValAspect(ctx.type) || !context.has(Proceeding)) return next(ctx, context);

    // aspect class do nothing.
    return context.get(Proceeding).pointcutCtor(ctx, next, context);

}


/**
 *  match pointcut interecptor.
 *
 * @export
 */
export const matchInterceptor = (ctx: RuntimeContext, next: HandlerFn, context: Context) => {
    // aspect class do nothing.
    if (!isValAspect(ctx.type) || !context.has(Proceeding)) return next(ctx, context);

    return context.get(Proceeding).pointcutProperty(ctx, next, context);
}

/**
 * is target can aspect or not.
 *
 * @export
 * @param {Type} targetType
 * @returns {boolean}
 */
function isValAspect(targetType: Type): boolean {
    return !(targetType as AnnotationType)[noPointcut]
}
