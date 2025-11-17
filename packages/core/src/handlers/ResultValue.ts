import { Abstract } from '@tsdi/ioc';
import { RunableContext } from '../ApplicationHandler';
// import { HandleContext } from './context';


/**
 * route mapping return result. 
 *
 * @export
 * @abstract
 * @class ResultValue
 */
@Abstract()
export abstract class ResultValue<T = any> {

    constructor(public contentType: string) { }

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
