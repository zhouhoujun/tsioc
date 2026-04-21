import { RuntimeContext, HandlerFn, ClassRef } from '@tsdi/ioc';
/**
 * pointcut interecptor.
 *
 * @export
 */
export declare const pointcutInterceptor: (typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) => any;
/**
 *  match pointcut interecptor.
 *
 * @export
 */
export declare const matchInterceptor: (typeRef: ClassRef, next: HandlerFn, context: RuntimeContext) => any;
