import { ObjectMap } from '../types';
import { IContainer } from '../IContainer';


/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {

    /**
     * the container.
     *
     * @type {IContainer}
     * @memberof ActionData
     */
    container?: IContainer;
    /**
     * design metadata.
     *
     * @type {*}
     * @memberof ActionData
     */
    designMetadata?: any;
    /**
     * custom class metadata.
     *
     * @type {T[]}
     * @memberof ActionData
     */
    metadata?: T[];
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
     * @type {Array<T[]>}
     * @memberof ActionData
     */
    paramMetadata?: Array<T[]>;
    /**
     * type instance.
     *
     * @type {*}
     * @memberof ActionData
     */
    instance?: any;
}

