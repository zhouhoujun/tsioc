import { lang, isUndefined, IContainerBuilder } from '@ts-ioc/core';
import { AppConfiguration, IApplicationBuilder, DefaultApplicationBuilder } from '@ts-ioc/bootstrap';
import { ContainerBuilder } from '@ts-ioc/platform-browser';
declare let System: any;
/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration<any> = {
    baseURL: '',
    debug: false,
    connections: {},
    setting: {}
}

export interface IBroserApplicationBuilder<T> extends IApplicationBuilder<T> {

}


/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class ApplicationBuilder<T> extends DefaultApplicationBuilder<T> implements IBroserApplicationBuilder<T> {

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
    static create<T>(baseURL?: string): ApplicationBuilder<T> {
        return new ApplicationBuilder<T>(baseURL);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    protected createBuilder() {
        return this;
    }

    protected getDefaultConfig(): AppConfiguration<T> {
        return lang.assign({}, defaultAppConfig as AppConfiguration<T>);
    }

}
