import { IContainer, Type, Defer, lang, isString, isFunction, isClass, IContainerBuilder, ModuleType, hasClassMetadata, Autorun, isUndefined, ModuleBuilder, ModuleConfiguration, IModuleBuilder, InjectToken, ObjectMap, Token } from '@ts-ioc/core';
import { ContainerBuilder } from './ContainerBuilder';


/**
 * App configuration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfiguration>('__IOC_AppConfiguration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration extends ModuleConfiguration {

    /**
     * custom config key value setting.
     *
     * @type {IMap<any>}
     * @memberOf AppConfiguration
     */
    setting?: ObjectMap<any>;

    /**
     * custom config connections.
     *
     * @type {ObjectMap<any>}
     * @memberof AppConfiguration
     */
    connections?: ObjectMap<any>;


    /**
     * aspect service path. default: './aop'
     *
     * @type {(string | string[])}
     * @memberof AppConfiguration
     */
    aop?: string | string[];

    /**
     * used aop aspect.
     *
     * @type {Token<any>[]}
     * @memberof AppConfiguration
     */
    usedAops?: Token<any>[];

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfiguration
     */
    logConfig?: any;

}

/**
 * default app configuration.
 */
const defaultAppConfig: AppConfiguration = <AppConfiguration>{
    rootdir: '',
    debug: false,
    aop: './aop',
    usedAops: [],
    connections: {},
    setting: {}
}

/**
 * browser platform.
 *
 * @export
 * @interface IPlatformBrowser
 * @extends {IPlatform}
 */
export interface IPlatformBrowser extends IModuleBuilder<AppConfiguration> {
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
export class PlatformBrowser<T extends AppConfiguration> extends ModuleBuilder<T> {

    baseURL: string;
    constructor(baseURL?: string) {
        super();
        this.baseURL = baseURL || !isUndefined(System) ? System.baseURL : location.href;
    }

    static create(rootdir?: string) {
        return new PlatformBrowser<AppConfiguration>(rootdir);
    }

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    protected getContainerBuilder() {
        if (!this.builder) {
            this.builder = new ContainerBuilder();
        }
        return this.builder;
    }

    protected getDefaultConfig(): T {
        return lang.assign({}, defaultAppConfig as T);
    }

    protected setRootdir(config: T) {
        config.rootdir = this.baseURL
    }

    protected async initIContainer(config: T, container: IContainer): Promise<IContainer> {
        container.bindProvider(AppConfigurationToken, config);
        await super.initIContainer(config, container);
        return container;
    }

}
