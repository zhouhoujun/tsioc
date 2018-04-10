import { Type, ModuleType } from './types';

/**
 * load options.
 *
 * @export
 * @interface LoadOptions
 */
export interface LoadOptions {

    /**
     * modules
     *
     * @type {((ModuleType | string)[])}
     * @memberof AsyncLoadOptions
     */
    modules?: (ModuleType | string)[];

}

/**
 * async load options.
 *
 * @export
 * @interface AsyncLoadOptions
 * @extends {LoadOptions}
 */
export interface AsyncLoadOptions extends LoadOptions {
    /**
     * fire express base on the root path.
     *
     * @type {string}
     * @memberof LoadOptions
     */
    basePath?: string;
    /**
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * @type {(string | string[])}
     * @memberof BuilderOptions
     */
    files?: string | string[];

}
