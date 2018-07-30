import { IContainer } from './IContainer';
import { Type, Modules, LoadType } from './types';
import { InjectToken } from './InjectToken';
import { IModuleLoader } from './IModuleLoader';

/**
 * ContainerBuilder interface token.
 * it is a token id, you can register yourself IContainerBuilder for this.
 */
export const ContainerBuilderToken = new InjectToken<IContainerBuilder>('DI_IContainerBuilder');

/**
 * container builder.
 *
 * @export
 * @interface IContainerBuilder
 */
export interface IContainerBuilder {

    /**
     * loader
     *
     * @type {IModuleLoader}
     * @memberof IContainerBuilder
     */
    readonly loader: IModuleLoader;

    /**
     * create a new container.
     *
     * @returns {IContainer}
     * @memberof IContainerBuilder
     */
    create(): IContainer;
    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<IContainer>}
     * @memberof IContainerBuilder
     */
    build(...modules: LoadType[]): Promise<IContainer>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {IContainer}
     * @memberof IContainerBuilder
     */
    syncBuild(...modules: Modules[]): IContainer;

    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    loadModule(container: IContainer, ...modules: LoadType[]): Promise<Type<any>[]>;

    /**
     * sync load modules
     *
     * @param {IContainer} container
     * @param {...Modules[]} modules
     * @memberof IContainerBuilder
     */
    syncLoadModule(container: IContainer, ...modules: Modules[]);

}
