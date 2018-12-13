import { IContainer } from './IContainer';
import { Container } from './Container';
import { Type, Modules, LoadType, Express } from './types';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import {
    IModuleLoader, ModuleLoaderToken, DefaultModuleLoader, IModuleInjectorChain,
    ModuleInjectorChainToken, IocExtModuleValidateToken, ModuleInjector, IocExtModuleValidate,
    ModuleInjectorChain, ModuelValidate, ModuleValidateToken, ModuleInjectorToken
} from './injectors';
import { PromiseUtil } from './utils';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class ContainerBuilder implements IContainerBuilder {

    private _loader: IModuleLoader;
    filter: Express<Type<any>, boolean>;
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
        let regModules = await this.loader.loadTypes(modules);
        let injTypes = [];
        if (regModules && regModules.length) {
            let injChain = this.getInjectorChain(container);
            await PromiseUtil.step(regModules.map(async typs => {
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

    syncLoadModule(container: IContainer, ...modules: Modules[]): Type<any>[] {
        let regModules = this.loader.getTypes(modules);
        let injTypes: Type<any>[] = [];
        if (regModules && regModules.length) {
            let injChain = this.getInjectorChain(container);
            regModules.forEach(typs => {
                let ityps = injChain.syncInject(container, typs);
                injTypes = injTypes.concat(ityps);
            });
        }
        return injTypes;
    }

    getInjectorChain(container: IContainer): IModuleInjectorChain {
        if (!container.has(ModuleInjectorChainToken)) {
            container.register(ModuleInjector)
                .bindProvider(ModuleValidateToken, new ModuelValidate())
                .bindProvider(IocExtModuleValidateToken, new IocExtModuleValidate())
                .bindProvider(ModuleInjectorChainToken,
                    new ModuleInjectorChain()
                        .next(container.resolve(ModuleInjectorToken, { provide: ModuleValidateToken, useValue: container.get(IocExtModuleValidateToken) }, { skipNext: true }))
                        .next(container.resolve(ModuleInjectorToken))
                );
        }
        return container.get(ModuleInjectorChainToken);
    }
}
