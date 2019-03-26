import { Token } from './types';

/**
 * Parameter
 *
 * @export
 * @interface IParameter
 */
export interface IParameter {
    /**
     * parameter name
     *
     * @type {string}
     * @memberof IParameter
     */
    name: string;
    /**
     * parameter type.
     *
     * @type {Token<any>}
     * @memberof IParameter
     */
    type: Token<any>;

    /**
     * provider for the parameter.
     *
     * @type {Token<any>}
     * @memberof IParameter
     */
    provider: Token<any>;
}
