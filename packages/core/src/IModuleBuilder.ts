import { IContainer } from './IContainer';
import { Type, LoadType, Token } from './types';
import { IContainerBuilder } from './IContainerBuilder';
import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken } from './InjectToken';

/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectToken<IModuleBuilder<any>>('__IOC_ModuleBuilder');

/**
 * custom define module.
 */
export type CustomDefineModule<T> = (container: IContainer, config?: ModuleConfiguration<T>, builder?: IModuleBuilder<T>) => any | Promise<any>;

/**
 * module builder
 *
 * @export
 * @interface IModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {

    /**
     * use an exist container for platform.
     *
     * @param {(IContainer | Promise<IContainer>)} container
     * @returns {this}
     * @memberof IPlatform
     */
    useContainer(container: IContainer | Promise<IContainer>): this;

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
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} modules build module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(modules: Token<T> | ModuleConfiguration<T>): Promise<T>;

}

