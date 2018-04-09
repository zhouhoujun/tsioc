import { Type, ModuleType } from './types';


export interface LoadOptions {


    /**
     * node modules.
     *
     * @type {(ModuleType[])}
     * @memberof BuilderOptions
     */
    modules?: ModuleType[];
}

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
