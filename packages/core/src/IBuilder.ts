import { IContainer, LoadType, Modules } from '@tsdi/ioc';


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
     */
    create(): IContainer;

    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<IContainer>}
     */
    build(...modules: LoadType[]): Promise<IContainer>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {IContainer}
     */
    syncBuild(...modules: Modules[]): IContainer;

}
