import { isUndefined, IContainerBuilder } from '@ts-ioc/core';
import { IApplicationBuilder, DefaultApplicationBuilder, AnyApplicationBuilder, IApplication } from '@ts-ioc/bootstrap';
import { ContainerBuilder } from '@ts-ioc/platform-browser';
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
 * @extends {DefaultApplicationBuilder}
 * @implements {IBroserApplicationBuilder<T>}
 */
export class ApplicationBuilder<T> extends DefaultApplicationBuilder<T> implements IApplicationBuilderBrowser<T> {

    constructor(baseURL?: string) {
        super(baseURL || !isUndefined(System) ? System.baseURL : location.href);
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
        return new ApplicationBuilder<any>(baseURL);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    protected createBuilder() {
        return this;
    }

}
