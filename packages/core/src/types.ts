import { Modules, Type } from '@tsdi/ioc';

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
     */
    files?: string | string[];

    /**
     * modules
     *
     * @type {((Modules | string)[])}
     */
    modules?: (Modules | string)[];
}

/**
 * child module.
 */
export interface ChildModule  {
    loadChild(): Promise<Type>;
}

/**
 * load module type.
 */
export type LoadType = Modules | string | PathModules | ChildModule
