import { Advicer } from './Advicer';
import { InjectToken } from '@tsdi/ioc';

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


export const AdvicesToken = new InjectToken<Advices>('AOP_ADVICES');
