import { ObjectMap } from '../types';


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
    propMetadata?: ObjectMap<T>;
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

