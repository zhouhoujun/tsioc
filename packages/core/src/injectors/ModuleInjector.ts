import { IModuleInjector, SyncModuleInjectorToken, ModuleInjectorToken, InjectorResult } from './IModuleInjector';
import { Type } from '../types';
import { IContainer } from '../IContainer';
import { PromiseUtil } from '../utils';
import { IModuleValidate } from './IModuleValidate';
import { Injectable } from '../core';


/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class BaseModuleInjector
 * @implements {IModuleInjector}
 */
export abstract class BaseModuleInjector implements IModuleInjector {

    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @param {boolean} [skipNext] skip next when has match module to injector.
     * @memberof BaseModuleInjector
     */
    constructor(protected validate?: IModuleValidate, protected skipNext?: boolean) {
    }

    abstract inject(container: IContainer, modules: Type<any>[]): any;

    protected filter(modules: Type<any>[]): Type<any>[] {
        modules = modules || [];
        return this.validate ? modules.filter(md => this.validate.validate(md)) : modules;
    }

    protected next(all: Type<any>[], filtered: Type<any>[]): Type<any>[] {
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

    protected setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}

/**
 * sync module injector.
 *
 * @export
 * @class SyncModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
@Injectable(SyncModuleInjectorToken)
export class SyncModuleInjector extends BaseModuleInjector implements IModuleInjector {

    constructor(protected validate: IModuleValidate, skipNext?: boolean) {
        super(validate, skipNext)
    }

    inject(container: IContainer, modules: Type<any>[]): InjectorResult {
        let types = this.filter(modules);
        if (types.length) {
            types.forEach(ty => {
                this.setup(container, ty);
            });
        }
        let next = this.next(modules, types);
        return { injected: types, next: next };
    }
}

/**
 * module injector.
 *
 * @export
 * @class ModuleInjector
 * @extends {BaseModuleInjector}
 * @implements {IModuleInjector}
 */
@Injectable(ModuleInjectorToken)
export class ModuleInjector extends BaseModuleInjector implements IModuleInjector {

    constructor(protected validate: IModuleValidate, skipNext?: boolean) {
        super(validate, skipNext)
    }

    async inject(container: IContainer, modules: Type<any>[]): Promise<InjectorResult> {
        let types = this.filter(modules);
        if (types.length) {
            await PromiseUtil.step(types.map(ty => {
                return this.setup(container, ty);
            }));
        }
        let next = this.next(modules, types);
        return { injected: types, next: next };
    }
}
