import { DataBinding } from './DataBinding';

/**
 * parse binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export abstract class ParseBinding<T> extends DataBinding<T> {
    /**
     * bind target.
     *
     * @abstract
     * @param {*} target
     * @param {*} [obj]
     * @memberof ParseBinding
     */
    abstract bind(target: any, obj?: any): void;
}
