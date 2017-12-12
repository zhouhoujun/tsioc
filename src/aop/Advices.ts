import { AdviceMetadata } from './metadatas';


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
}
