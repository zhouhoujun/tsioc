import { Injectable } from '@tsdi/ioc';


/**
 * activity result.
 *
 * @export
 * @class ActivityResult
 * @template T
 */
@Injectable
export class ActivityResult<T = any> {

    constructor() {

    }

    /**
     * activity result vaule.
     *
     * @type {T}
     * @memberof ActivityResult
     */
    value: T;

    /**
     * error of activity result.
     *
     * @type {Error}
     * @memberof ActivityResult
     */
    error: Error;

}
