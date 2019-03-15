import { IContainer } from './IContainer';
import { Container } from './Container';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { PromiseUtil, Type, Modules, LoadType, Express } from '@ts-ioc/ioc';
import { IModuleLoader, ModuleLoader, ModuleInjectorManager } from './services';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class ContainerBuilder implements IContainerBuilder {

    filter: Express<Type<any>, boolean>;
    private _loader?: IModuleLoader
    constructor(loader?: IModuleLoader) {
        this._loader = loader;
    }

    create(): IContainer {
        let container = new Container();
        container.bindProvider(ContainerBuilderToken, () => this);
        if (this._loader) {
            container.bindProvider(ModuleLoader, () => this._loader);
        }
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
        let regModules = await this.getLoader(container).loadTypes(modules);
        let injTypes = [];
        if (regModules && regModules.length) {
            let injMgr = container.get(ModuleInjectorManager);
            await PromiseUtil.step(regModules.map(typs => async () => {
                let ityps = await injMgr.inject(container, typs);
                injTypes = injTypes.concat(ityps);
            }));
        }
        return injTypes;
    }


    syncBuild(...modules: Modules[]): IContainer {
        let container: IContainer = this.create();
        if (modules.length) {
            this.syncLoadModule(container, ...modules);
        }
        return container;
    }

    syncLoadModule(container: IContainer, ...modules: Modules[]): Type<any>[] {
        let regModules = this.getLoader(container).getTypes(modules);
        let injTypes: Type<any>[] = [];
        if (regModules && regModules.length) {
            let injMgr = container.get(ModuleInjectorManager);
            regModules.forEach(typs => {
                let ityps = injMgr.syncInject(container, typs);
                injTypes = injTypes.concat(ityps);
            });
        }
        return injTypes;
    }

    protected getLoader(container: IContainer): IModuleLoader {
        return container.get(ModuleLoader) || this._loader;
    }

}
