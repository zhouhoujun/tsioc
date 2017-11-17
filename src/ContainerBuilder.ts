import { IContainer } from './IContainer';
import { Container } from './Container';
import { Type } from './index';
import { request } from 'https';
const globby = require('globby');


export interface BuilderOptions {
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

export class ContainerBuilder {

    create(): IContainer {
        return new Container();
    }

    /**
     * build container.
     *
     * @param {BuilderOptions} [options]
     * @returns { Promise<IContainer>}
     * @memberof ContainerBuilder
     */
    async build(options?: BuilderOptions) {
        let container: IContainer = this.create();
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
