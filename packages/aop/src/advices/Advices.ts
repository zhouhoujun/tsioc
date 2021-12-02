import { tokenId, Token } from '@tsdi/ioc';
import { Advicer } from './Advicer';

/**
 * advices of target.
 *
 * @export
 * @interface Advices
 */
export interface Advices {
    asyncPointcut?: boolean;
    Pointcut: Advicer[];
    asyncBefore?: boolean;
    Before: Advicer[];
    asyncAfter?: boolean;
    After: Advicer[];
    asyncAround?: boolean;
    Around: Advicer[];
    asyncAfterThrowing?: boolean;
    AfterThrowing: Advicer[];
    asyncAfterReturning?: boolean;
    AfterReturning: Advicer[];
}

/**
 * ADVICES token.
 */
export const ADVICES: Token<Advices> = tokenId<Advices>('AOP_ADVICES');
