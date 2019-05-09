import { ActivityContext } from './ActivityContext';

/**
 * value pipe.
 *
 * @export
 * @abstract
 * @class ValuePipe
 */
export abstract class ValuePipe {
    /**
     * transform date
     *
     * @abstract
     * @param {*} value
     * @returns {Promise<any>}
     * @memberof ValuePipe
     */
    abstract transform(value: any): Promise<any>;

    /**
     * refresh context
     *
     * @abstract
     * @param {ActivityContext} ctx
     * @param {*} value
     * @returns {Promise<void>}
     * @memberof ValuePipe
     */
    abstract refresh?(ctx: ActivityContext, value: any): Promise<void>;
}
