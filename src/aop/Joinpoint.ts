import { IPointcut } from './IPointcut';
import { Token } from '../types';
import { Injectable, NonePointcut } from '../core/index';
import { IParameter } from '../IParameter';
import { MethodMetadata } from '../core/index';

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

     /**
     * join point state.
     *
     * @type {JoinpointState}
     * @memberof IJoinpoint
     */
    state: JoinpointState;
    /**
     * params of pointcut.
     *
     * @type {IParameter[]}
     * @memberof IJoinpoint
     */
    params: IParameter[];
    /**
     * args of pointcut.
     *
     * @type {any[]}
     * @memberof IJoinpoint
     */
    args: any[];
    /**
     * pointcut returing data
     *
     * @type {*}
     * @memberof IJoinpoint
     */
    returning?: any;
    /**
     * pointcut throwing error.
     *
     * @type {*}
     * @memberof IJoinpoint
     */
    throwing?: any;

    /**
     * pointcut target instance
     *
     * @type {*}
     * @memberof IJoinpoint
     */
    target?: any;
    /**
     * pointcut target type.
     *
     * @type {Token<any>}
     * @memberof IJoinpoint
     */
    targetType?: Token<any>;

}

/**
 * Join point data.
 *
 * @export
 * @class Joinpoint
 * @implements {IJoinpoint}
 */
@Injectable()
@NonePointcut()
export class Joinpoint implements IJoinpoint {
    /**
     * method name
     *
     * @type {string}
     * @memberof Joinpoint
     */
    name: string;
    /**
     * full name.
     *
     * @type {string}
     * @memberof Joinpoint
     */
    fullName: string;
    /**
     * join point state.
     *
     * @type {JoinpointState}
     * @memberof Joinpoint
     */
    state: JoinpointState;
    /**
     * params of pointcut.
     *
     * @type {IParameter[]}
     * @memberof Joinpoint
     */
    params: IParameter[];
    /**
     * args of pointcut.
     *
     * @type {any[]}
     * @memberof Joinpoint
     */
    args: any[];
    /**
     * pointcut returing data
     *
     * @type {*}
     * @memberof Joinpoint
     */
    returning?: any;
    /**
     * pointcut throwing error.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    throwing?: any;

    /**
     * pointcut target instance
     *
     * @type {*}
     * @memberof Joinpoint
     */
    target?: any;
    /**
     * pointcut target type.
     *
     * @type {Token<any>}
     * @memberof Joinpoint
     */
    targetType?: Token<any>;

    /**
     * annotation metadatas.
     *
     * @type {MethodMetadata[]}
     * @memberof Joinpoint
     */
    annotation?: MethodMetadata[];


    constructor(options: IJoinpoint) {
        this.name = options.name;
        this.fullName = options.fullName;
        this.params = options.params || [];
        this.args = options.args;
        this.returning = options.returning;
        this.state = options.state;
        this.target = options.target;
        this.targetType = options.targetType;
        this.throwing = options.throwing;
        this.annotation = options.annotation || [];
    }
}
