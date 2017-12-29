import { IPointcut } from './IPointcut';
import { Token } from '../types';
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

    static parse(json: IJoinpoint): Joinpoint {
        let jp = new Joinpoint();
        if (json) {
            jp.name = json.name;
            jp.fullName = json.fullName;
            jp.args = json.args;
            jp.returning = json.returning;
            jp.state = json.state;
            jp.target = json.target;
            jp.targetType = json.targetType;
            jp.throwing = json.throwing;
        }
        return jp;
    }

}
