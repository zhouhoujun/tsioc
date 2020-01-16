import { IInjector, Modules, Type, ActionInjector, LoadType, IocCoreService, ContainerProxy } from '@tsdi/ioc';
import { IModuleLoader, ModuleLoader } from './ModuleLoader';
import { InjectLifeScope } from '../injectors/InjectLifeScope';


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
        return this.proxy().get(ModuleLoader);
    }

    /**
     * use modules.
     *
     * @param {IInjector} injector
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(injector: IInjector, ...modules: Modules[]): Type[] {
        let types = this.getLoader().getTypes(...modules);
        types.forEach(ty => {
            injector.registerType(ty);
        });
        return types;
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
        return this.proxy().get(ActionInjector).getInstance(InjectLifeScope).register(injector, ...mdls);
    }
}
