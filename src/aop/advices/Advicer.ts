import { Type } from '../../types';
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

