import { Abstract } from '@tsdi/ioc';
import { RunableContext } from '../handler';


/**
 * route mapping return result. 
 *
 * @export
 * @abstract
 * @class ResultValue
 */
@Abstract()
export abstract class ResultValue<T> {

    constructor(public contentType: string, readonly value: T) { }

    /**
     * send value.
     *
     * @abstract
     * @param {RunableContext} context
     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(context: RunableContext): Promise<any>;
}
