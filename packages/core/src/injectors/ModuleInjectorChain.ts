import { IModuleInjectorChain } from './IModuleInjectorChain';
import { IModuleInjector } from './IModuleInjector';
import { SyncModuleInjector, ModuleInjector } from './ModuleInjector';
import { Type } from '../types';
import { IContainer } from '../IContainer';
import { PromiseUtil } from '../utils';

/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {IModuleInjectorChain}
 */
export class ModuleInjectorChain implements IModuleInjectorChain {

    protected _injectors: IModuleInjector[];
    get injectors(): IModuleInjector[] {
        return this._injectors;
    }

    constructor() {
        this._injectors = [];
    }

    first(injector: IModuleInjector) {
        if (this.isInjector(injector)) {
            this._injectors.unshift(injector);
        }
        return this;
    }

    next(injector: IModuleInjector) {
        if (this.isInjector(injector)) {
            this._injectors.push(injector);
        }
        return this;
    }

    protected isInjector(injector: IModuleInjector) {
        return injector instanceof ModuleInjector || injector instanceof SyncModuleInjector;
    }

    inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        return PromiseUtil.first<Type<any>[]>(this.injectors.map(jtor => jtor.inject(container, modules)), types => types && types.length > 0).catch(err => []);
    }

    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let types: Type<any>[];
        this.injectors.forEach(jtor => {
            if (types && types.length) {
                return false;
            }
            if (jtor instanceof SyncModuleInjector) {
                types = jtor.inject(container, modules);
            }
            return true;
        });
        return types;
    }
}

