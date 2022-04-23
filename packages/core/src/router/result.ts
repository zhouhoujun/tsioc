import { Abstract } from '@tsdi/ioc';
import { TransportContext } from '../transport/context';

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
     * @param {TransportContext} context
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: TransportContext): Promise<any>;
}