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

    value: T;

    error: Error;

}
