import { IContainer } from './IContainer';
import { Container } from './Container';
import { isFunction, isClass, toAbsoluteSrc, symbols, isString, isNodejsEnv } from './utils/index';
import { Type } from './Type';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader } from './IModuleLoader';
import { AsyncLoadOptions, LoadOptions } from './LoadOptions';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import { NodeModuleLoader } from './NodeModuleLoader';

export class ContainerBuilder implements IContainerBuilder {

    constructor(private loader?: IModuleLoader) {
        if (!loader) {
            if (isNodejsEnv()) {
                this.loader = new NodeModuleLoader();
            } else {
                this.loader = new BrowserModuleLoader();
            }
        }
    }
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
            let modules = await this.loader.load(options);
            if (options.modules && options.modules.length) {
                let mds = await Promise.all(options.modules.map(nmd => {
                    return isString(nmd) ? this.loader.loadModule(nmd) : nmd;
                }));
                modules = modules.concat(mds);
            }

            modules.forEach(m => {
                regModules.push(...this.registerModule(container, m));
            })
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
                let regModule = isString(nmd) ? this.loader.loadModule(nmd) : nmd;
                let modules2 = this.registerModule(container, regModule);
                regModules = regModules.concat(modules2);
            });
        }
        return regModules;
    }

    protected registerModule(container: IContainer, regModule: Type<any> | object): Type<any>[] {
        let regModules: Type<any>[] = [];
        try {
            if (isClass(regModule)) {
                regModules.push(regModule);
                container.register(regModule);
            } else {
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
