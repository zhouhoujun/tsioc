import { IJoinpoint } from './IJoinpoint';
import { Type, Injectable, MethodMetadata, IParameter } from '@ts-ioc/core';
import { JoinpointState } from './JoinpointState';
import { Advicer } from '../advices/index';
import { NonePointcut } from '../decorators/index';

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
     * pointcut returing
     *
     * @type {*}
     * @memberof Joinpoint
     */
    returning?: any;

    /**
     * the result value of returing.
     *
     * @type {*}
     * @memberof Joinpoint
     */
    returningValue?: any;

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
