import { ObjectMap } from '../../types';
import { IContainer } from '../../IContainer';
import { Type } from '../../index';


/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {
    /**
     * design metadata.
     *
     * @type {*}
     * @memberof ActionData
     */
    designMetadata?: any[];

    /**
     * custom class metadata.
     *
     * @type {T[]}
     * @memberof ActionData
     */
    metadata?: T[];

    /**
     * method metadata.
     *
     * @type {ObjectMap<T[]>}
     * @memberof ActionData
     */
    methodMetadata?: ObjectMap<T[]>;
    /**
     * property metadata.
     *
     * @type {ObjectMap<T>}
     * @memberof ActionData
     */
    propMetadata?: ObjectMap<T[]>;
    /**
     * paramerter metadata.
     *
     * @type {T[][]>}
     * @memberof ActionData
     */
    paramMetadata?: T[][];
    /**
     * instance.
     *
     * @type {*}
     * @memberof ActionData
     */
    instance?: any;

    /**
     * instance type.
     *
     * @type {Type<any>}
     * @memberof ActionData
     */
    instanceType?: Type<any>;
}

