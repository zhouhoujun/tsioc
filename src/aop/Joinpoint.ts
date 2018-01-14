import { IPointcut } from './IPointcut';
import { Type } from '../Type';
import { Injectable, Inject, NonePointcut, MethodMetadata } from '../core/index';
import { IParameter } from '../IParameter';
import { Advicer } from './Advices';
import { IContainer } from '../IContainer';
import { Advice } from './decorators/index';

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
     * prov joinpoint.
     *
     * @type {IJoinpoint}
     * @memberof Joinpoint
     */
    provJoinpoint: IJoinpoint;

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
     * Advicer of joinpoint.
     *
     * @type {Advicer}
     * @memberof IJoinpoint
     */
    advicer: Advicer;

    /**
     * orgin pointcut method metadatas.
     *
     * @type {MethodMetadata[]}
     * @memberof IJoinpoint
     */
    annotations: MethodMetadata[];

    /**
     * pointcut target instance
     *
     * @type {*}
     * @memberof IJoinpoint
     */
    target: any;
    /**
     * pointcut target type.
     *
     * @type {Token<any>}
     * @memberof IJoinpoint
     */
    targetType: Type<any>;

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
     * prov joinpoint.
     *
     * @type {IJoinpoint}
     * @memberof Joinpoint
     */
    provJoinpoint: IJoinpoint;
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
     * advicer of joinpoint
     *
     * @type {Advicer}
     * @memberof Joinpoint
     */
    advicer: Advicer;

    /**
     * orgin pointcut method metadatas.
     *
     * @type {MethodMetadata[]}
     * @memberof Joinpoint
     */
    annotations: MethodMetadata[];

    /**
     * pointcut target instance
     *
     * @type {*}
     * @memberof Joinpoint
     */
    target: any;
    /**
     * pointcut target type.
     *
     * @type {Type<any>}
     * @memberof Joinpoint
     */
    targetType: Type<any>;


    constructor(options: IJoinpoint) {
        this.provJoinpoint = options.provJoinpoint;
        this.name = options.name;
        this.fullName = options.fullName;
        this.params = options.params || [];
        this.args = options.args;
        this.returning = options.returning;
        this.throwing = options.throwing;
        this.state = options.state;
        this.advicer = options.advicer;
        this.annotations = options.annotations;
        this.target = options.target;
        this.targetType = options.targetType;
    }

}
