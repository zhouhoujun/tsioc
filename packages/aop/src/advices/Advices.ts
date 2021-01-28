import { Advicer } from './Advicer';
import { tokenId, Token } from '@tsdi/ioc';

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


export const ADVICES: Token<Advices> = tokenId<Advices>('AOP_ADVICES');
