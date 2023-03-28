import { EndpointContext } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
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
     * @param {EndpointContext} context
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: EndpointContext): Promise<any>;
}
