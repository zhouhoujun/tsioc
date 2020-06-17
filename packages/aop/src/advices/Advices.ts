import { Advicer } from './Advicer';
import { tokenId, TokenId } from '@tsdi/ioc';

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


export const AdvicesToken: TokenId<Advices> = tokenId<Advices>('AOP_ADVICES');
