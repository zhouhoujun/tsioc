import { ProviderTypes } from '@ts-ioc/ioc';

/**
 * build options.
 *
 * @export
 * @interface BootOptions
 * @template T
 */
export interface BootOptions {
    /**
     * build base on target.
     *
     * @type {*}
     * @memberof BootOptions
     */
    target?: any;

    /**
     * boot data for runner.
     *
     * @type {*}
     * @memberof BootOptions
     */
    data?: any;

    /**
     * providers.
     *
     * @type {ProviderTypes[]}
     * @memberof BootOptions
     */
    providers?: ProviderTypes[];
}

