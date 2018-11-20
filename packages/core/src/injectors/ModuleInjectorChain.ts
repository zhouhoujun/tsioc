import { IModuleInjectorChain } from './IModuleInjectorChain';
import { IModuleInjector, InjectorResult } from './IModuleInjector';
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

    async inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        let types: Type<any>[] = [];
        await PromiseUtil.forEach<InjectorResult>(
            this.injectors.map(jtor => (ijrt: InjectorResult) => jtor.inject(container, ijrt.next)),
            result => {
                types = types.concat(result.injected || []);
                return result.next && result.next.length > 0;
            },
            { injected: [], next: modules }
        )
            .catch(err => {
                console.log(err);
                return [];
            });
        return types;
    }

    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let types: Type<any>[] = [];
        let completed = false;
        this.injectors.forEach(jtor => {
            if (completed) {
                return false;
            }
            if (jtor instanceof SyncModuleInjector) {
                let result = jtor.inject(container, modules);
                types = types.concat(result.injected);
                completed = (!result.next || result.next.length < 1);
            }
            return true;
        });
        return types;
    }
}

