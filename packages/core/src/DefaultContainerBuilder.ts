import { IContainer } from './IContainer';
import { Container } from './Container';
import { isFunction, isClass, symbols, isString } from './utils/index';
import { Type } from './types';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader } from './IModuleLoader';
import { AsyncLoadOptions, LoadOptions } from './LoadOptions';
import { DefaultModuleLoader } from './DefaultModuleLoader';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class DefaultContainerBuilder implements IContainerBuilder {

    constructor(private loader?: IModuleLoader) {
        if (!loader) {
            this.loader = new DefaultModuleLoader();
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
        let regModules = await this.getTypes(options);
        return this.registers(container, regModules);
    }


    syncBuild(options: LoadOptions): IContainer {
        let container: IContainer = this.create();
        if (options) {
            this.syncLoadModule(container, options);
        }
        return container;
    }

    syncLoadModule(container: IContainer, options: LoadOptions): Type<any>[] {
        let regModules = this.syncLoadTypes(options);
        return this.registers(container, regModules);
    }

    /**
     * load types from module.
     *
     * @param {LoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    async loadTypes(options: LoadOptions): Promise<Type<any>[]> {
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
                regModules.push(...this.getTypes(m));
            })
        }
        return regModules;
    }

    /**
     * sync load types from module.
     *
     * @param {LoadOptions} options
     * @returns {Type<any>[]}
     * @memberof IContainerBuilder
     */
    syncLoadTypes(options: LoadOptions): Type<any>[] {
        let regModules: Type<any>[] = [];
        if (options && options.modules && options.modules.length > 0) {
            options.modules.forEach(nmd => {
                let regModule = isString(nmd) ? this.loader.loadModule(nmd) : nmd;
                let modules2 = this.getTypes(regModule);
                regModules = regModules.concat(modules2);
            });
        }
        return regModules;
    }

    protected registers(container: IContainer, types: Type<any>[]): Type<any>[] {
        types = types || [];
        types.forEach(typ => {
            container.register(typ);
        });
        return types;
    }

    protected getTypes(regModule: Type<any> | object): Type<any>[] {
        let regModules: Type<any>[] = [];

        if (isClass(regModule)) {
            regModules.push(regModule);
        } else {
            let rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (let p in rmodules) {
                if (isClass(rmodules[p])) {
                    regModules.push(rmodules[p]);
                }
            }
        }

        return regModules;
    }
}
