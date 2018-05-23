import { IContainer } from './IContainer';
import { Type, LoadType, Token } from './types';
import { IContainerBuilder } from './IContainerBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken } from './InjectToken';

/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectToken<IModuleBuilder<ModuleConfiguration>>('__IOC_ModuleBuilder');

/**
 * custom define module.
 */
export type CustomDefineModule<T extends ModuleConfiguration> = (container: IContainer, config?: ModuleConfiguration, builder?: IModuleBuilder<T>) => any | Promise<any>;

/**
 * module builder
 *
 * @export
 * @interface IModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T extends ModuleConfiguration> {

    /**
     * use an exist container for platform.
     *
     * @param {(IContainer | Promise<IContainer>)} container
     * @returns {this}
     * @memberof IPlatform
     */
    useContainer(container: IContainer | Promise<IContainer>): this;

    /**
     * use custom configuration.
     *
     * @param {(string | T)} [config]
     * @returns {this}
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this;

    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof Bootstrap
     */
    useContainerBuilder(builder: IContainerBuilder);

    /**
     * use module, custom module.
     *
     * @param {(...(LoadType | CustomDefineModule<T>)[])} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    useModules(...modules: (LoadType | CustomDefineModule<T>)[]): this;


    /**
     * bootstrap app via main module.
     *
     * @param {(Token<any>|T)} modules bootstrap module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    bootstrap(modules: Token<any> | T): Promise<any>;

}

