import { Class, ReflectiveRef } from '@tsdi/ioc';
import { AdviceMetadata } from '../metadata/meta';
// import { IPointcut } from '../joinpoints/IPointcut';


/**
 * match express.
 */
export type MatchExpress = (name: string | symbol, fullName: string, targetRef?: Class|null, target?: any, accessor?: 'get' | 'set') => boolean;



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

