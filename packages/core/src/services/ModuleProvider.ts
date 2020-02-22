import { IInjector, Modules, Type, IocCoreService, ContainerProxy, ActionInjectorToken } from '@tsdi/ioc';
import { IModuleLoader, ModuleLoader } from './ModuleLoader';
import { InjectLifeScope } from '../injectors/InjectLifeScope';
import { LoadType } from '../types';


export class ModuleProvider extends IocCoreService {

    constructor(private proxy: ContainerProxy) {
        super();
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader {
        return this.proxy().getInstance(ModuleLoader);
    }

    /**
     * load modules.
     *
     * @param {IInjector} injector
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    async load(injector: IInjector, ...modules: LoadType[]): Promise<Type[]> {
        let mdls = await this.getLoader().load(...modules);
        return this.proxy().getInstance(ActionInjectorToken).getInstance(InjectLifeScope).register(injector, ...mdls);
    }
}
