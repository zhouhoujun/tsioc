import { HttpContext } from '../context';

/**
 * controller method return result type.
 *
 * @export
 * @abstract
 * @class ResultValue
 */
export abstract class ResultValue {

    constructor(public contentType: string) {
    }

    /**
     * send value.
     *
     * @abstract
     * @param {HttpContext} ctx

     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: HttpContext): Promise<any>;
}
