import { lang, isUndefined, Token, Type, IContainerBuilder } from '@ts-ioc/core';
import { AppConfiguration, IApplicationBuilder, ApplicationBuilder } from '@ts-ioc/bootstrap';
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
export class BroserApplicationBuilder<T> extends ApplicationBuilder<T> implements IBroserApplicationBuilder<T> {

    constructor(baseURL?: string) {
        super(baseURL || !isUndefined(System) ? System.baseURL : location.href);
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


/**
 * browser platform.
 *
 * @export
 * @interface IPlatformBrowser
 * @extends {IPlatform}
 */
export interface IPlatformBrowser extends IBroserApplicationBuilder<AppConfiguration<any>> {

}


/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class PlatformBrowser extends BroserApplicationBuilder<any> implements IPlatformBrowser {

    constructor(baseURL?: string) {
        super(baseURL);
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {PlatformBrowser} PlatfromBrowser instance.
     * @memberof PlatformBrowser
     */
    static create(baseURL?: string): PlatformBrowser {
        return new PlatformBrowser(baseURL);
    }

    /**
     * bootstrap application via main module.
     *
     * @template T
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token main module or appliaction configuration.
     * @returns {Promise<any>}  main module bootstrap class instance.
     * @memberof PlatformBrowser
     */
    bootstrap<T>(token: Token<T> | Type<any> | AppConfiguration<T>): Promise<any> {
        return super.bootstrap(token);
    }

}
