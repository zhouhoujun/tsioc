import { IInjector, Type, IocCoreService, ActionInjectorToken, InjectorProxy } from '@tsdi/ioc';
import { IModuleLoader, ModuleLoader } from './ModuleLoader';
import { InjLifeScope } from '../injects/InjLifeScope';
import { IContainer } from '../IContainer';
import { LoadType } from '../types';


export class ModuleProvider extends IocCoreService {

    constructor(private proxy: InjectorProxy<IContainer>) {
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
        return this.proxy().getInstance(ActionInjectorToken).getInstance(InjLifeScope).register(injector, ...mdls);
    }
}
