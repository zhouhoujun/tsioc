import { AdviceMetadata } from './metadatas';
import { Type } from '../Type';


export interface Advices {
    Before: Advicer[]
    After: Advicer[],
    Around: Advicer[],
    AfterThrowing: Advicer[],
    AfterReturning: Advicer[]
}


/**
 * AdviceInvokerData
 *
 * @export
 * @interface Advicer
 */
export interface Advicer {
    advice: AdviceMetadata;
    aspect: any;
    aspectType: Type<any>;
}
