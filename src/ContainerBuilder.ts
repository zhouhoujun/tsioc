import { IContainer } from './IContainer';
import { Container } from './Container';
import { isFunction, isClass } from './utils';
import { request } from 'https';
import { Type } from './Type';
import { isString } from 'util';
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
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    loadModule(container: IContainer, options: LoadOptions): Promise<Type<any>[]>
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
     * @returns {Promise<Type<any>[]>}
     * @memberof ContainerBuilder
     */
    async loadModule(container: IContainer, options: LoadOptions): Promise<Type<any>[]> {
        let regModules: Type<any>[] = [];
        if (options) {
            if (options.files) {
                let files: string[] = await globby(options.files);
                files.forEach(fp => {
                    let modules1 = this.registerModule(container, fp);
                    regModules = regModules.concat(modules1);
                });
            }

            if (options.modules && options.modules.length > 0) {
                options.modules.forEach(nmd => {
                    let modules2 = this.registerModule(container, nmd);
                    regModules = regModules.concat(modules2);
                });
            }
        }

        return regModules;
    }

    protected registerModule(container: IContainer, regModule: string | Type<any> | object) {
        let regModules = [];
        try {
            if (isClass(regModule)) {
                regModules.push(regModule);
                container.register(regModule);
            } else {
                regModule = isString(regModule) ? require(regModule) : regModule;
                let rmodules = regModule['exports'] ? regModule['exports'] : regModule;
                for (let p in rmodules) {
                    if (isClass(rmodules[p])) {
                        regModules.push(rmodules[p]);
                        container.register(rmodules[p]);
                    }
                }
            }
        } catch {

        }
        return regModules;
    }
}
