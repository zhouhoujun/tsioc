import { IPointcut } from './IPointcut';
import { Token } from '../types';
import { Injectable, NonePointcut } from '../core/index';


export enum JoinpointState {
    Before = 'Before',
    Pointcut = 'Pointcut',
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
@Injectable()
@NonePointcut()
export class Joinpoint implements IJoinpoint {
    name: string;
    fullName: string;
    state: JoinpointState;
    args: any[];
    target?: any;
    targetType?: Token<any>;
    returning?: any;
    throwing?: any;

    constructor(json?: IJoinpoint) {
        // if (json) {
            this.name = json.name;
            this.fullName = json.fullName;
            this.args = json.args;
            this.returning = json.returning;
            this.state = json.state;
            this.target = json.target;
            this.targetType = json.targetType;
            this.throwing = json.throwing;
        // }
    }
}
