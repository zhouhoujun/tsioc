import { IContainer } from './IContainer';
import { Type, ModuleType } from './types';
import { AsyncLoadOptions } from './LoadOptions';

/**
 * container builder.
 *
 * @export
 * @interface IContainerBuilder
 */
export interface IContainerBuilder {
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
     * @param {AsyncLoadOptions} [options]
     * @returns {Promise<IContainer>}
     * @memberof IContainerBuilder
     */
    build(options?: AsyncLoadOptions): Promise<IContainer>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {IContainer}
     * @memberof IContainerBuilder
     */
    syncBuild(...modules: ModuleType[]): IContainer;

    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {AsyncLoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    loadModule(container: IContainer, options: AsyncLoadOptions): Promise<Type<any>[]>;

    /**
     * sync load modules
     *
     * @param {IContainer} container
     * @param {...ModuleType[]} modules
     * @memberof IContainerBuilder
     */
    syncLoadModule(container: IContainer, ...modules: ModuleType[]);

}
