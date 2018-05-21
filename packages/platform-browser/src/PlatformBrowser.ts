import { IContainer, Type, Defer, lang, isString, isFunction, isClass, IContainerBuilder, ModuleType, hasClassMetadata, Autorun, isUndefined, ModuleBuilder, ModuleConfiguration, IModuleBuilder } from '@ts-ioc/core';
import { ContainerBuilder } from './ContainerBuilder';

/**
 * browser platform.
 *
 * @export
 * @interface IPlatformBrowser
 * @extends {IPlatform}
 */
export interface IPlatformBrowser extends IModuleBuilder {
    /**
     * base url.
     *
     * @type {string}
     * @memberof IPlatformBrowser
     */
    baseURL: string;
}

declare let System: any;
/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export class PlatformBrowser extends ModuleBuilder {

    baseURL: string;
    constructor(baseURL?: string) {
        super();
        this.baseURL = baseURL || !isUndefined(System) ? System.baseURL : location.href;
    }

    static create(rootdir?: string) {
        return new PlatformBrowser(rootdir);
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainerBuilder() {
        if (!this.builder) {
            this.builder = new ContainerBuilder();
        }
        return this.builder;
    }

    protected setRootdir(config: ModuleConfiguration) {
        config.rootdir = this.baseURL
    }

}
