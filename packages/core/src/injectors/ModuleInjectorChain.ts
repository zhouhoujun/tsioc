import { IModuleInjectorChain, ModuleInjectorChainToken } from './IModuleInjectorChain';
import { IModuleInjector } from './IModuleInjector';
import { ModuleInjector } from './ModuleInjector';
import { Type } from '../types';
import { IContainer } from '../IContainer';
import { PromiseUtil, lang } from '../utils';
import { InjectedProcessToken } from './IInjectedProcess';

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
        return injector instanceof ModuleInjector;
    }

    async inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        let types: Type<any>[] = [];
        await PromiseUtil.runInChain(this.injectors.map(jtor => {
            return async (mds: Type<any>[], next?: () => Promise<void>) => {
                let ijRt = await jtor.inject(container, mds);
                if (ijRt.injected && ijRt.injected.length) {
                    types = types.concat(ijRt.injected);
                }
                if (ijRt.next && ijRt.next.length > 0) {
                    return next();
                }
            }
        }), modules);
        this.injectedProcess(container, types);
        return types;
    }

    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let types: Type<any>[] = [];
        let completed = false;
        this.injectors.some(jtor => {
            if (jtor instanceof ModuleInjector) {
                let result = jtor.syncInject(container, modules);
                types = types.concat(result.injected);
                completed = (!result.next || result.next.length < 1);
            }
            return completed;
        });
        this.injectedProcess(container, types);
        return types;
    }

    /**
     * injected.
     *
     * @param {Type<any>[]} modules
     * @returns {void}
     * @memberof ModuleInjectorChain
     */
    protected injectedProcess(container: IContainer, modules: Type<any>[]): void {
        let proc = container.getService(InjectedProcessToken, [lang.getClass(this), ModuleInjectorChainToken]);
        if (proc) {
            proc.pipe(modules);
        }
    }
}

