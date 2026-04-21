import { ClassRef, Invocation, InterceptorFn } from '@tsdi/ioc';
import { AdviceMetadata } from './metadata/meta';
import { JoinPoint } from './joinpoints/JoinPoint';
export interface MatchOptions {
    way?: 'root' | 'host' | 'full';
    accessor?: 'get' | 'set' | 'value';
}
/**
 * match express.
 */
export type MatchExpress = (name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions) => boolean;
/**
 * AdviceInvokerData
 *
 * @export
 * @interface Advicer
 */
export interface Advicer {
    /**
     * advice for pointcut.
     *
     * @type {AdviceMetadata}
     */
    advice: AdviceMetadata;
    /**
     * match express fn.
     */
    match: MatchExpress;
    /**
     * aspect type.
     *
     * @type {Type}
     */
    aspect: Invocation;
    accessor?: 'get' | 'set' | 'value';
}
export interface AroundProceeding {
    /**
    * advice for pointcut.
    *
    * @type {AdviceMetadata}
    */
    advice: AdviceMetadata;
    /**
     * match express fn.
     */
    match: MatchExpress;
    /**
     * aspect type.
     *
     * @type {Type}
     */
    aspect: Invocation;
    interceptor: InterceptorFn<JoinPoint>;
}
