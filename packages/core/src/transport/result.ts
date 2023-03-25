import { Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { Context } from './middleware';

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
     * @param {EndpointContext<Context>} context
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: EndpointContext<Context>): Promise<any>;
}
