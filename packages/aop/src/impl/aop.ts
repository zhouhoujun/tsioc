import { AbstractType, RuntimeContext, AnnotationType, HandlerFn, noPointcut, ClassRef } from '@tsdi/ioc';
import { Proceeding } from '../Proceeding';



/**
 * pointcut interecptor.
 *
 * @export
 */
export const pointcutInterceptor = (typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    const runtime = context.runtime;
    if (!isValAspect(typeRef.type) || !runtime.context.has(Proceeding)) return next(typeRef, context);

    // aspect class do nothing.
    return runtime.context.get(Proceeding).pointcutCtor(typeRef, next, context);

}


/**
 *  match pointcut interecptor.
 *
 * @export
 */
export const matchInterceptor = (typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    const runtime = context.runtime;
    // aspect class do nothing.
    if (!isValAspect(typeRef.type) || !runtime.context.has(Proceeding)) return next(typeRef, context);

    return runtime.context.get(Proceeding).pointcutProperty(typeRef, next, context);
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
