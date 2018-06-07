import { IContainer } from './IContainer';
import { Container } from './Container';
import { Type, ModuleType, LoadType } from './types';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { IModuleLoader, ModuleLoaderToken } from './IModuleLoader';
import { DefaultModuleLoader } from './DefaultModuleLoader';
// import { hasOwnClassMetadata, IocModule } from './core/index';

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
        container.bindProvider(ModuleLoaderToken, () => this.loader);
        return container;
    }

    /**
     * build container.
     *
     * @param {...LoadType[]} [modules]
     * @returns
     * @memberof DefaultContainerBuilder
     */
    async build(...modules: LoadType[]) {
        let container: IContainer = this.create();
        if (modules.length) {
            await this.loadModule(container, ...modules);
        }
        return container;
    }

    /**
     * load modules for container.
     *
     * @param {IContainer} container
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof DefaultContainerBuilder
     */
    async loadModule(container: IContainer, ...modules: LoadType[]): Promise<Type<any>[]> {
        let regModules = await this.loader.loadTypes(...modules);
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
        let regModules = this.loader.getTypes(...modules);
        return this.registers(container, regModules);
    }

    protected registers(container: IContainer, types: Type<any>[]): Type<any>[] {
        types = types || [];
        types.forEach(typ => {
            container.register(typ);
        });
        return types;
    }

}
