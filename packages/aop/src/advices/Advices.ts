import { tokenId, Token } from '@tsdi/ioc';
import { Advicer } from './Advicer';

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

/**
 * ADVICES token.
 */
export const ADVICES: Token<Advices> = tokenId<Advices>('AOP_ADVICES');
