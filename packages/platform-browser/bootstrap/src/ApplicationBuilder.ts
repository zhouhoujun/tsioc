import { lang, isUndefined, IContainerBuilder } from '@ts-ioc/core';
import { AppConfiguration, IApplicationBuilder, DefaultApplicationBuilder } from '@ts-ioc/bootstrap';
import { ContainerBuilder } from '@ts-ioc/platform-browser';
declare let System: any;
/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration = {
    baseURL: '',
    debug: false,
    connections: {},
    setting: {}
}

export interface IBroserApplicationBuilder extends IApplicationBuilder {

}


/**
 * application builder for browser side.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {DefaultApplicationBuilder}
 * @implements {IBroserApplicationBuilder<T>}
 */
export class ApplicationBuilder extends DefaultApplicationBuilder implements IBroserApplicationBuilder {

    constructor(baseURL?: string) {
        super(baseURL || !isUndefined(System) ? System.baseURL : location.href);
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {ApplicationBuilder} ApplicationBuilder instance.
     * @memberof PlatformBrowser
     */
    static create(baseURL?: string): ApplicationBuilder {
        return new ApplicationBuilder(baseURL);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    protected createBuilder() {
        return this;
    }

    protected getDefaultConfig(): AppConfiguration {
        return lang.assign({}, defaultAppConfig as AppConfiguration);
    }

}
