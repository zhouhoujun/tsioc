import { Token } from './types';
import { IContainer } from './IContainer';

/**
 * service provider.
 *
 * @export
 * @interface Provider
 */
export interface Provider {
    /**
     * service provider is value or value factory.
     *
     * @memberof Provider
     */
    value?: any | ((container?: IContainer, type?: Token<any>) => any)
    /**
     * service is instance of type.
     *
     * @type {Token<any>}
     * @memberof Provider
     */
    type?: Token<any>;

    /**
     * service value is the result of type instance invoke the method return value.
     *
     * @type {string}
     * @memberof Provider
     */
    method?: string;

    /**
     * custome exnteds target.
     *
     * @param {*} target
     * @memberof Provider
     */
    extendsTarget?(target: any);
}
