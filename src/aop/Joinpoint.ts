import { IPointcut } from './IPointcut';
import { Token } from '../index';
import { Injectable } from '../core/index';


export enum JoinpointState {
    Before = 'Before',
    After = 'After',
    AfterReturning = 'AfterReturning',
    AfterThrowing = 'AfterThrowing'
}

/**
 * Joinpoint interface
 *
 * @export
 * @interface IJoinpoint
 * @extends {IPointcut}
 */
export interface IJoinpoint extends IPointcut {
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

/**
 * Join point.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
@Injectable
 export class Joinpoint implements IJoinpoint {
    name: string;
    fullName: string;
    state: JoinpointState;
    args: any[];
    target?: any;
    targetType?: Token<any>;
    returning?: any;
    throwing?: any;

    constructor() {

    }
}
