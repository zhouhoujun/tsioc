import { lang, isUndefined, IContainerBuilder } from '@ts-ioc/core';
import { AppConfigure, IApplicationBuilder, DefaultApplicationBuilder, AnyApplicationBuilder } from '@ts-ioc/bootstrap';
import { ContainerBuilder } from '@ts-ioc/platform-browser';
declare let System: any;
/**
 * default app configuration.
 */
const defaultAppConfig: AppConfigure = {
    baseURL: '',
    debug: false,
    connections: {},
    setting: {}
}

export interface IApplicationBuilderBroser<T> extends IApplicationBuilder<T> {

}

export interface AnyApplicationBuilderBroser extends AnyApplicationBuilder {

}


/**
 * application builder for browser side.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {DefaultApplicationBuilder}
 * @implements {IBroserApplicationBuilder<T>}
 */
export class ApplicationBuilder<T> extends DefaultApplicationBuilder<T> implements IApplicationBuilderBroser<T> {

    constructor(baseURL?: string) {
        super(baseURL || !isUndefined(System) ? System.baseURL : location.href);
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} [baseURL] application start up base path.
     * @returns {AnyApplicationBuilderBroser} ApplicationBuilder instance.
     * @memberof ApplicationBuilder
     */
    static create(baseURL?: string): AnyApplicationBuilderBroser {
        return new ApplicationBuilder<any>(baseURL);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder();
    }

    protected createBuilder() {
        return this;
    }

    protected getDefaultConfig(): AppConfigure {
        return lang.assign({}, defaultAppConfig as AppConfigure);
    }

}
