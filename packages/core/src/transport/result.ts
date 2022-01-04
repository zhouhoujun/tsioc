import { Abstract } from '@tsdi/ioc';
import { Context } from './context';

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
     * @param {Context} ctx
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: Context): Promise<any>;
}
