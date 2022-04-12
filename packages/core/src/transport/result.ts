import { Abstract } from '@tsdi/ioc';
import { WritableResponse } from './packet';

/**
 * route mapping return result. 
 *
 * @export
 * @abstract
 * @class ResultValue
 */
@Abstract()
export abstract class ResultValue {

    constructor(public contentType: string) { }

    /**
     * send value.
     *
     * @abstract
     * @param {WritableResponse} response
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(response: WritableResponse): Promise<any>;
}
