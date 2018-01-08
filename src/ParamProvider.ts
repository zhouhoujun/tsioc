import { IContainer } from './IContainer';
import { Token } from './types';
import { Provider } from './Provider';

/**
 * param provider.
 *
 * @export
 * @interface ParamProvider
 */
export interface ParamProvider extends Provider {
    /**
     * param index or param name.
     *
     * @type {number}
     * @memberof ParamProvider
     */
    index?: number | string;
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
