import { Type } from '@tsioc/core';
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
     * @type {Type<any>}
     * @memberof Advicer
     */
    aspectType: Type<any>;

}

