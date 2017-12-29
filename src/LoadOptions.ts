import { Type } from './Type';


export interface LoadOptions {


    /**
     * node modules.
     *
     * @type {((string | Type<any> | object)[])}
     * @memberof BuilderOptions
     */
    modules?: (string | Type<any> | object)[];
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
