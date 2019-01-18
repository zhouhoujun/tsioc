import { IModuleInjector, ModuleInjectorToken, InjectorResult } from './IModuleInjector';
import { Type } from '../types';
import { IContainer } from '../IContainer';
import { PromiseUtil, lang } from '../utils';
import { IModuleValidate } from './IModuleValidate';
import { Injectable } from '../core';
import { InjectedProcessToken } from './IInjectedProcess';


/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class BaseModuleInjector
 * @implements {IModuleInjector}
 */
@Injectable(ModuleInjectorToken)
export class ModuleInjector implements IModuleInjector {

    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @param {boolean} [skipNext] skip next when has match module to injector.
     * @memberof BaseModuleInjector
     */
    constructor(protected validate?: IModuleValidate, protected skipNext?: boolean) {
    }

    async inject(container: IContainer, modules: Type<any>[]): Promise<InjectorResult> {
        let types = (modules || []).filter(ty => this.valid(container, ty));
        if (types.length) {
            await PromiseUtil.step(types.map(ty => () => this.setup(container, ty)));
            this.injectedProcess(container, types);
        }
        let next = this.getNext(modules, types);
        return { injected: types, next: next };
    }

    syncInject(container: IContainer, modules: Type<any>[]): InjectorResult {
        let types = (modules || []).filter(ty => this.valid(container, ty));
        if (types.length) {
            types.forEach(ty => {
                this.syncSetup(container, ty);
            });
            this.injectedProcess(container, types);
        }
        let next = this.getNext(modules, types);
        return { injected: types, next: next };
    }

    /**
     * injected.
     *
     * @param {Type<any>[]} types
     * @returns {void}
     * @memberof ModuleInjectorChain
     */
    protected injectedProcess(container: IContainer, types: Type<any>[]): void {
        let proc = container.getService(InjectedProcessToken, lang.getClass(this), true);
        if (proc) {
            proc.pipe(types);
        }
    }

    protected valid(container: IContainer, type: Type<any>): boolean {
        if (!this.validate) {
            return true;
        }
        return this.validate.valid(type);
    }

    protected getNext(all: Type<any>[], filtered: Type<any>[]): Type<any>[] {
        if (filtered.length === 0) {
            return all;
        }
        if (this.skipNext) {
            return null;
        }
        if (filtered.length === all.length) {
            return null;
        }
        return all.filter(it => filtered.indexOf(it) < 0);
    }

    protected async setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
    protected syncSetup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}
