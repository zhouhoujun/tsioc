import { Pointcut } from './Pointcut';
import { Token } from '../index';

/**
 * Joinpoint
 *
 * @export
 * @interface Joinpoint
 * @extends {Pointcut}
 */
export interface Joinpoint extends Pointcut {
    args: any[];
    /**
     * target
     *
     * @type {*}
     * @memberof Joinpoint
     */
    target?: any;

    targetType?: Token<any>;

    returning?: any;

    throwing?: any;
}
