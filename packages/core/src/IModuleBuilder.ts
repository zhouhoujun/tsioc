import { IContainer } from './IContainer';
import { InjectToken } from './InjectToken';
import { ObjectMap, Token, ModuleType, Type, LoadType } from './types';
import { IContainerBuilder } from './IContainerBuilder';

/**
 * AppConfiguration token.
 */
export const ModuleConfigurationToken = new InjectToken<ModuleConfiguration>('__IOC_AppConfiguration');


/**
 * module configuration.
 *
 * @export
 * @interface ModuleConfiguration
 * @extends {ObjectMap<any>}
 */
export interface ModuleConfiguration extends ObjectMap<any> {
    /**
     * system file root directory.
     */
    rootdir?: string;

    providers?: any[];

    imports: LoadType[];

    exports: Type<any>[];
    /**
     * set this module bootstrap start with.
     *
     * @type {Token<any>}
     * @memberof ModuleConfiguration
     */
    bootstrap?: Token<any>;


    /**
     * debug log.
     *
     * @type {boolean}
     * @memberof AppConfiguration
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfiguration
     */
    logConfig?: any;

}


/**
 * custom define module.
 */
export type CustomDefineModule = (container: IContainer, config?: ModuleConfiguration, platform?: IModuleBuilder) => any | Promise<any>;

/**
 * server app bootstrap
 *
 * @export
 * @class Bootstrap
 */
export interface IModuleBuilder {

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
     * @param {(string | ModuleConfiguration)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | ModuleConfiguration): this;

    /**
     * get configuration.
     *
     * @returns {Promise<ModuleConfiguration>}
     * @memberof Bootstrap
     */
    getConfiguration(): Promise<ModuleConfiguration>;


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
     * @param {(...(LoadType | CustomDefineModule)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules: (LoadType | CustomDefineModule)[]): this;

    /**
     * bootstrap app via main module.
     *
     * @param {Type<any>} modules bootstrap module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    bootstrap(modules: Type<any>): Promise<any>;

}

