import { IContainer } from './IContainer';
import { Token } from './types';

/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
export interface ParamProvider {
    /**
     * param value provider is value or value factory.
     *
     * @memberof ParamProvider
     */
    value?: any | ((container?: IContainer, type?: Token<any>) => any)
    /**
     * param value is instance of type.
     *
     * @type {Token<any>}
     * @memberof ParamProvider
     */
    type?: Token<any>;
    /**
     * param value is the result of type instance invoke the method return value.
     *
     * @type {string}
     * @memberof ParamProvider
     */
    method?: string;
    /**
     * param index or param name.
     *
     * @type {number}
     * @memberof ParamProvider
     */
    index: number | string;
}

/**
 * async param provider.
 * async load source file and execution as param value.
 *
 * @export
 * @interface AsyncParamProvider
 * @extends {ParamProvider}
 */
export interface AsyncParamProvider extends ParamProvider {
    /**
     * match ref files.
     *
     * @type {(string | string[])}
     * @memberof AsyncParamProvider
     */
    files?: string | string[];
    /**
     * execute the method of load type.
     *
     * @type {string}
     * @memberof AsyncParamProvider
     */
    execution?: string;
}
