import { IContainer } from './IContainer';
import { Container } from './Container';
import { isFunction, isClass, isString } from './utils/index';
import { Type, ModuleType } from './types';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { IModuleLoader } from './IModuleLoader';
import { AsyncLoadOptions } from './LoadOptions';
import { DefaultModuleLoader } from './DefaultModuleLoader';
import { hasOwnClassMetadata, IocModule } from './core/index';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class DefaultContainerBuilder implements IContainerBuilder {


    private _loader: IModuleLoader;
    constructor(loader?: IModuleLoader) {
        this._loader = loader;
    }

    get loader(): IModuleLoader {
        if (!this._loader) {
            this._loader = new DefaultModuleLoader();
        }

        return this._loader;
    }

    create(): IContainer {
        let container = new Container();
        container.bindProvider(ContainerBuilderToken, () => this);
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
        let regModules = await this.loadTypes(options);
        return this.registers(container, regModules);
    }


    syncBuild(...modules: ModuleType[]): IContainer {
        let container: IContainer = this.create();
        if (modules.length) {
            this.syncLoadModule(container, ...modules);
        }
        return container;
    }

    syncLoadModule(container: IContainer, ...modules: ModuleType[]) {
        let regModules = this.getModules(...modules);
        return this.registers(container, regModules);
    }

    /**
     * load types from module.
     *
     * @param {LoadOptions} options
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    protected async loadTypes(options: AsyncLoadOptions): Promise<Type<any>[]> {
        let modules: ModuleType[];
        if (options) {
            modules = await this.loader.load(options);
            if (options.modules && options.modules.length) {
                let mds = await Promise.all(options.modules.map(nmd => {
                    return isString(nmd) ? this.loader.loadModule(nmd) : nmd;
                }));
                modules = modules.concat(mds);
            }


        }
        return this.getModules(...modules);
    }

    protected registers(container: IContainer, types: Type<any>[]): Type<any>[] {
        types = types || [];
        types.forEach(typ => {
            container.register(typ);
        });
        return types;
    }

    protected getModules(...modules: ModuleType[]): Type<any>[] {
        let regModules: Type<any>[] = [];
        modules.forEach(m => {

            let types = this.getTypes(m);
            let iocModule = types.find(it => hasOwnClassMetadata(IocModule, it));
            if (iocModule) {
                regModules.push(iocModule);
            } else {
                regModules.push(...types);
            }

        });

        return regModules;
    }

    protected getTypes(regModule: ModuleType): Type<any>[] {
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
