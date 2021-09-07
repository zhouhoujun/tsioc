import { Container, LoadType, Modules } from '@tsdi/ioc';


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
     * @returns {Container}
     */
    create(): Container;

    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<Container>}
     */
    build(...modules: LoadType[]): Promise<Container>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {Container}
     */
    syncBuild(...modules: Modules[]): Container;

}
