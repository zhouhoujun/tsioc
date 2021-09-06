import { Injector, LoadType, Modules } from '@tsdi/ioc';


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
     * @returns {Injector}
     */
    create(): Injector;

    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<Injector>}
     */
    build(...modules: LoadType[]): Promise<Injector>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {Injector}
     */
    syncBuild(...modules: Modules[]): Injector;

}
