import { RunContext } from '../handler';
/**
 * route mapping return result.
 *
 * @export
 * @abstract
 * @class ResultValue
 */
export declare abstract class ResultValue {
    contentType: string;
    constructor(contentType: string);
    /**
     * send value.
     *
     * @abstract
     * @param {RunContext} context
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(context: RunContext): Promise<any>;
}
