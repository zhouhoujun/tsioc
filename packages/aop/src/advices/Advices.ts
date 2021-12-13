import { tokenId, Token } from '@tsdi/ioc';
import { Advicer } from './Advicer';

/**
 * advices of target.
 *
 * @export
 * @interface Advices
 */
export interface Advices {
    syncPointcut?: boolean;
    Pointcut: Advicer[];
    syncBefore?: boolean;
    Before: Advicer[];
    syncAfter?: boolean;
    After: Advicer[];
    syncAround?: boolean;
    Around: Advicer[];
    syncAfterThrowing?: boolean;
    AfterThrowing: Advicer[];
    syncAfterReturning?: boolean;
    AfterReturning: Advicer[];
}

/**
 * ADVICES token.
 */
export const ADVICES: Token<Advices> = tokenId<Advices>('AOP_ADVICES');
