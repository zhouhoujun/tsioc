import { Advicer } from './Advicer';
import { tokenId } from '@tsdi/ioc';

/**
 * advices of target.
 *
 * @export
 * @interface Advices
 */
export interface Advices {
    Pointcut: Advicer[];
    Before: Advicer[];
    After: Advicer[];
    Around: Advicer[];
    AfterThrowing: Advicer[];
    AfterReturning: Advicer[];
}


export const AdvicesToken = tokenId<Advices>('AOP_ADVICES');
