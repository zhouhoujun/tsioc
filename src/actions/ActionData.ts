import { ObjectMap } from '../types';


/**
 * the action execute data.
 *
 * @export
 * @interface ActionData
 * @template T
 */
export interface ActionData<T> {
    designMetadata?: any;
    metadata?: T | ObjectMap<T> | Array<T>;
    instance?: any;
}

