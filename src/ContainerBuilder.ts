import { IContainer } from './IContainer';
import { Container } from './Container';
import { Type } from './index';
import { request } from 'https';
const globby = require('globby');


export interface LoadOptions {
    /**
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * @type {(string | string[])}
     * @memberof BuilderOptions
     */
    files?: string | string[];

    /**
     * node modules.
     *
     * @type {((string | Type<any> | object)[])}
     * @memberof BuilderOptions
     */
    modules?: (string | Type<any> | object)[];
}

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
     * @param {LoadOptions} [options]
     * @returns {Promise<IContainer>}
     * @memberof IContainerBuilder
     */
    build(options?: LoadOptions): Promise<IContainer>;
    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {LoadOptions} options
     * @returns {Promise<IContainer>}
     * @memberof IContainerBuilder
     */
    loadModule(container: IContainer, options: LoadOptions): Promise<IContainer>
}

export class ContainerBuilder implements IContainerBuilder {

    create(): IContainer {
        return new Container();
    }

    /**
     * build container.
     *
     * @param {LoadOptions} [options]
     * @returns { Promise<IContainer>}
     * @memberof ContainerBuilder
     */
    async build(options?: LoadOptions) {
        let container: IContainer = this.create();
        if (options) {
            await this.loadModule(container, options);
        }
        return container;
    }

    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {LoadOptions} options
     * @returns
     * @memberof ContainerBuilder
     */
    async loadModule(container: IContainer, options: LoadOptions) {
        if (options) {
            if (options.files) {
                let files: string[] = await globby(options.files);
                files.forEach(fp => {
                    this.registerModule(container, fp);
                });
            }

            if (options.modules && options.modules.length > 0) {
                options.modules.forEach(nmd => {
                    this.registerModule(container, nmd);
                });
            }

            return container;

        } else {
            return container;
        }
    }

    protected registerModule(container: IContainer, regModule: string | Type<any> | object) {
        try {
            if (typeof regModule === 'function') {
                container.register(regModule);
            } else {
                regModule = typeof regModule === 'string' ? require(regModule) : regModule;
                let modules = regModule['exports'] ? regModule['exports'] : regModule;
                for (let p in modules) {
                    if (typeof modules[p] === 'function') {
                        container.register(modules[p]);
                    }
                }
            }
        } catch {

        }
    }
}
