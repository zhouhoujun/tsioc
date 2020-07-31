import { Token } from './tokens';

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
     * @type {Token}
     * @memberof IParameter
     */
    type: Token;
    /**
     * provider for the parameter.
     *
     * @type {Token}
     * @memberof IParameter
     */
    provider: Token;
}
