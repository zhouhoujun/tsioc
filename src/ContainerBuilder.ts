import { IContainer } from './IContainer';
import { Container } from './Container';
import { isFunction, isClass, toAbsoluteSrc, symbols } from './utils';
import { request } from 'https';
import { Type } from './Type';
import { isString } from 'util';
import { IContainerBuilder, AsyncLoadOptions, LoadOptions } from './IContainerBuilder';
const globby = require('globby');


export class ContainerBuilder implements IContainerBuilder {
    create(): IContainer {
        let container = new Container();
        container.bindProvider(symbols.IContainerBuilder, () => this);
        return container;
    }

    /**
     * build container.
     *
     * @param {AsyncLoadOptions} [options]
     * @returns { Promise<IContainer>}
     * @memberof ContainerBuilder
     */
    async build(options?: AsyncLoadOptions) {
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
     * @param {AsyncLoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof ContainerBuilder
     */
    async loadModule(container: IContainer, options: AsyncLoadOptions): Promise<Type<any>[]> {
        let regModules: Type<any>[] = [];
        if (options) {
            if (options.files) {
                let files: string[] = await globby(toAbsoluteSrc(options.basePath, options.files));
                files.forEach(fp => {
                    let modules1 = this.registerModule(container, fp);
                    regModules = regModules.concat(modules1);
                });
            }
            regModules.concat(this.snycLoadModule(container, options));
        }

        return regModules;
    }


    syncBuild(options: LoadOptions): IContainer {
        let container: IContainer = this.create();
        if (options) {
            this.snycLoadModule(container, options);
        }
        return container;
    }
    snycLoadModule(container: IContainer, options: LoadOptions): Type<any>[] {
        let regModules: Type<any>[] = [];
        if (options && options.modules && options.modules.length > 0) {
            options.modules.forEach(nmd => {
                let modules2 = this.registerModule(container, nmd);
                regModules = regModules.concat(modules2);
            });
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
