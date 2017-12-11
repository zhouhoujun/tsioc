import { Pointcut } from './Pointcut';
import { Token } from '../index';


export enum JoinpointState {
    Before = 'Before',
    After =  'After',
    AfterReturning = 'AfterReturning',
    AfterThrowing = 'AfterThrowing'
}

/**
 * Joinpoint
 *
 * @export
 * @interface Joinpoint
 * @extends {Pointcut}
 */
export interface Joinpoint extends Pointcut {
    state: JoinpointState;
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
