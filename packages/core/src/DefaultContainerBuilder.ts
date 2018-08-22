import { IContainer } from './IContainer';
import { Container } from './Container';
import { Type, Modules, LoadType, Express } from './types';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { hasOwnClassMetadata, IocExt } from './core';
import { IModuleLoader, ModuleLoaderToken, DefaultModuleLoader, IModuleInjectorChain, ModuleInjectorChainToken, SyncModuleInjector } from './injectors';
import { PromiseUtil } from './utils';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class DefaultContainerBuilder implements IContainerBuilder {

    private _loader: IModuleLoader;
    filter: Express<Type<any>, boolean>;
    constructor(loader?: IModuleLoader, filter?: Express<Type<any>, boolean>) {
        this._loader = loader;
        this.filter = filter || (it => hasOwnClassMetadata(IocExt, it))
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
        let regModules = await this.loader.loadTypes(modules);
        let injTypes = [];
        if (regModules && regModules.length) {
            let injChain = this.getInjectorChain(container);
            await PromiseUtil.forEach(regModules.map(async typs => {
                let ityps = await injChain.inject(container, typs);
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

    syncLoadModule(container: IContainer, ...modules: Modules[]) {
        let regModules = this.loader.getTypes(modules);
        let injTypes = [];
        if (regModules && regModules.length) {
            let injChain = this.getInjectorChain(container);
            regModules.forEach(typs => {
                let ityps = injChain.syncInject(container, typs);
                injTypes = injTypes.concat(ityps);
            });
        }
        return injTypes;
    }

    protected injectorChain: IModuleInjectorChain;
    protected getInjectorChain(container: IContainer): IModuleInjectorChain {
        let currChain = container.get(ModuleInjectorChainToken);
        if (this.injectorChain !== currChain) {
            this.injectorChain = null;
        }
        if (!this.injectorChain) {
            this.injectorChain = currChain;
            this.injectorChain.next(new SyncModuleInjector(this.filter))
                .next(new SyncModuleInjector());
        }

        return this.injectorChain;
    }

}
