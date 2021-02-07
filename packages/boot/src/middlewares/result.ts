import { Abstract } from '@tsdi/ioc';
import { MessageContext } from './ctx';

/**
 * controller method return result type.
 *
 * @export
 * @abstract
 * @class ResultValue
 */
@Abstract()
export abstract class ResultValue {

    constructor(public contentType: string) {
    }

    /**
     * send value.
     *
     * @abstract
     * @param {MessageContext} ctx

     * @returns {Promise<any>}
     * @memberof ResultValue
     */
    abstract sendValue(ctx: MessageContext): Promise<any>;
}
