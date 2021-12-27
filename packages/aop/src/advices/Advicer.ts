import { OperationRef } from '@tsdi/ioc';
import { MatchPointcut } from '../joinpoints/MatchPointcut';

/**
 * AdviceInvokerData
 *
 * @export
 * @interface Advicer
 */
export interface Advicer extends MatchPointcut {
    /**
     * aspect type.
     *
     * @type {Type}
     */
    aspect: OperationRef;
}

