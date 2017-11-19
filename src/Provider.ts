import { Token } from './types';

/**
 * provider
 *
 * @export
 * @interface Provider
 */
export interface Provider {
    /**
     * provide.
     *
     * @type {Token<any>}
     * @memberof Provider
     */
    provide: Token<any>;
    /**
     * alias name for provide.
     *
     * @type {string}
     * @memberof Provider
     */
    alias?: string;
}
