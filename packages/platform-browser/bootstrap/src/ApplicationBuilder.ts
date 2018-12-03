import { isUndefined, } from '@ts-ioc/core';
import { IApplicationBuilder, ApplicationBuilder, AnyApplicationBuilder } from '@ts-ioc/bootstrap';
import { BrowserModule } from '@ts-ioc/platform-browser';
declare let System: any;

export interface IApplicationBuilderBrowser<T> extends IApplicationBuilder<T> {

}

export interface AnyApplicationBuilderBrowser extends AnyApplicationBuilder {

}


/**
 * browser app.
 *
 * @export
 * @template T
 * @param {string} [baseURL]
 * @returns {IApplicationBuilderBrowser<T>}
 */
export function browserApp<T>(baseURL?: string): IApplicationBuilderBrowser<T> {
    return new ApplicationBuilder<T>(baseURL);
}

/**
 * application builder for browser side.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ApplicationBuilder}
 * @implements {IBroserApplicationBuilder<T>}
 */
export class BrowserApplicationBuilder<T> extends ApplicationBuilder<T> implements IApplicationBuilderBrowser<T> {

    constructor(baseURL?: string) {
        super(baseURL || !isUndefined(System) ? System.baseURL : location.href);
        this.use(BrowserModule);
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {AnyApplicationBuilderBrowser} ApplicationBuilder instance.
     * @memberof ApplicationBuilder
     */
    static create(baseURL?: string): AnyApplicationBuilderBrowser {
        return new BrowserApplicationBuilder<any>(baseURL);
    }
}
