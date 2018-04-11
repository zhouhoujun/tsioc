import { Type, ModuleType } from './types';


/**
 * async load options.
 *
 * @export
 * @interface AsyncLoadOptions
 */
export interface AsyncLoadOptions {
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

    /**
     * modules
     *
     * @type {((ModuleType | string)[])}
     * @memberof AsyncLoadOptions
     */
    modules?: (ModuleType | string)[];

}
