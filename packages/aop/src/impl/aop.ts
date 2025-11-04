import { AbstractType, IocContext, AnnotationType, HandlerFn, Context, noPointcut, ClassRef } from '@tsdi/ioc';
import { Proceeding } from '../Proceeding';



/**
 * pointcut interecptor.
 *
 * @export
 */
export const pointcutInterceptor = (typeRef: ClassRef, next: HandlerFn, context: IocContext) => {
    if (!isValAspect(typeRef.type) || !context.has(Proceeding)) return next(typeRef, context);

    // aspect class do nothing.
    return context.get(Proceeding).pointcutCtor(typeRef, next, context);

}


/**
 *  match pointcut interecptor.
 *
 * @export
 */
export const matchInterceptor = (typeRef: ClassRef, next: HandlerFn, context: IocContext) => {
    // aspect class do nothing.
    if (!isValAspect(typeRef.type) || !context.has(Proceeding)) return next(typeRef, context);

    return context.get(Proceeding).pointcutProperty(typeRef, next, context);
}

/**
 * is target can aspect or not.
 *
 * @export
 * @param {AbstractType} targetType
 * @returns {boolean}
 */
function isValAspect(targetType: AbstractType): boolean {
    return !(targetType as AnnotationType)[noPointcut]
}
