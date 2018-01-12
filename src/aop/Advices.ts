import { AdviceMetadata } from './metadatas/index';
import { Type } from '../Type';


export interface Advices {
    Pointcut: Advicer[];
    Before: Advicer[];
    After: Advicer[];
    Around: Advicer[];
    AfterThrowing: Advicer[];
    AfterReturning: Advicer[];
}


/**
 * AdviceInvokerData
 *
 * @export
 * @interface Advicer
 */
export interface Advicer {
    advice: AdviceMetadata;
    aspectType: Type<any>;
}
