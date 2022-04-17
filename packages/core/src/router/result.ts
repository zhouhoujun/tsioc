import { Abstract } from '@tsdi/ioc';
import { ServerResponse } from '../transport/packet';

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
     * @param {ServerResponse} response
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(response: ServerResponse): Promise<any>;
}
