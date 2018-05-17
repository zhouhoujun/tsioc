import { IContainer } from './IContainer';
import { InjectToken } from './InjectToken';
import { ObjectMap, Token, ModuleType, Type } from './types';
import { AsyncLoadOptions } from './LoadOptions';
import { IContainerBuilder } from './IContainerBuilder';

/**
 * AppConfiguration token.
 */
export const AppConfigurationToken = new InjectToken<AppConfiguration>('__IOC_AppConfiguration');

/**
 * app configuration.
 *
 * @export
 * @interface AppConfiguration
 * @extends {ObjectMap<any>}
 */
export interface AppConfiguration extends ObjectMap<any> {
    /**
     * system file root directory.
     */
    rootdir?: string;

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
export const defaultAppConfig: AppConfiguration = <AppConfiguration>{
    rootdir: '',
    debug: false,
    aop: './aop',
    usedAops: [],
    connections: {},
    setting: {}
}


/**
 * custom define module.
 */
export type CustomDefineModule = (container: IContainer, config?: AppConfiguration, platform?: IPlatform) => any | Promise<any>;

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export interface IPlatform {

    /**
     * use an exist container for platform.
     *
     * @param {(IContainer | Promise<IContainer>)} container
     * @returns {this}
     * @memberof IPlatform
     */
    useContainer(container: IContainer | Promise<IContainer>): this;

    /**
     * get container of bootstrap.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainer(): Promise<IContainer>;

    /**
     * use custom configuration.
     *
     * @param {(string | AppConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfiguration): this;

    /**
     * get configuration.
     *
     * @returns {Promise<AppConfiguration>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<AppConfiguration>;


    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof Bootstrap
     */
    useContainerBuilder(builder: IContainerBuilder);

    /**
     * get container builder.
     *
     * @returns
     * @memberof Bootstrap
     */
    getContainerBuilder(): IContainerBuilder;

    /**
     * use module, custom module.
     *
     * @param {(...(ModuleType | string | CustomDefineModule)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: (ModuleType | string | CustomDefineModule)[]): this;

    /**
     * bootstrap app via main module.
     *
     * @param {Type<any>} modules bootstrap module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    bootstrap(modules: Type<any>): Promise<any>;

}

