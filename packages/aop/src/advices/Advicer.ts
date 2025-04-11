import { Class, ReflectiveRef } from '@tsdi/ioc';
import { AdviceMetadata } from '../metadata/meta';
// import { IPointcut } from '../joinpoints/IPointcut';


export interface MatchOptions {
    way?: 'root' | 'host' | 'full';
    accessor?: 'get' | 'set' 
}

/**
 * match express.
 */
export type MatchExpress = (name: string | symbol, fullName: string, targetRef?: Class | null, target?: any, options?: MatchOptions) => boolean;



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
    aspect: ReflectiveRef;

    accessor?: 'get' | 'set' | 'value';
}

