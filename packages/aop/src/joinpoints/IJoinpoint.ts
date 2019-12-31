import { IParameter, Type, Injector, TypeMetadata } from '@tsdi/ioc';
import { IPointcut } from './IPointcut';
import { JoinpointState } from './JoinpointState';
import { Advicer } from '../advices/Advicer';

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
     * @type {TypeMetadata[]}
     * @memberof IJoinpoint
     */
    annotations: TypeMetadata[];

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
     * @type {Token}
     * @memberof IJoinpoint
     */
    targetType: Type;

    originProvider: Injector;

    currProvider: Injector;

}
