import { Modules } from '@tsdi/ioc';

/**
 * load modules in base on an path.
 *
 * @export
 * @interface PathModules
 */
export interface PathModules {
    /**
     * fire express base on the root path.
     *
     * @type {string}
     * @memberof LoadOptions
     */
    basePath?: string;
    /**
     * in nodejs:
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * in browser:
     * script file url.
     * @type {(string | string[])}
     * @memberof BuilderOptions
     */
    files?: string | string[];

    /**
     * modules
     *
     * @type {((Modules | string)[])}
     * @memberof AsyncLoadOptions
     */
    modules?: (Modules | string)[];
}

/**
 * load module type.
 */
export type LoadType = Modules | string | string[] | PathModules;
