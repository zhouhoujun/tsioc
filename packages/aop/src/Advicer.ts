import { Class, InvocationInvoker } from '@tsdi/ioc';
import { AdviceMetadata } from './metadata/meta';


export interface MatchOptions {
    way?: 'root' | 'host' | 'full';
    accessor?: 'get' | 'set' | 'value'
}

/**
 * match express.
 */
export type MatchExpress = (name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions) => boolean;



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
    aspect: InvocationInvoker;

    accessor?: 'get' | 'set' | 'value';
}

