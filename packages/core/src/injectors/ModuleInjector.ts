import { IModuleInjector, SyncModuleInjectorToken, ModuleInjectorToken } from './IModuleInjector';
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

    constructor(protected validate?: IModuleValidate) {
    }

    abstract inject(container: IContainer, modules: Type<any>[]): any;

    protected filter(modules: Type<any>[]): Type<any>[] {
        modules = modules || [];
        return this.validate ? modules.filter(md => this.validate.validate(md)) : modules;
    }

    protected setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}

/**
 * sync module injector.
 *
 * @export
 * @class ModuleInjector
 * @implements {IModuleInjector}
 */
@Injectable(SyncModuleInjectorToken)
export class SyncModuleInjector extends BaseModuleInjector implements IModuleInjector {

    constructor(protected validate: IModuleValidate) {
        super(validate)
    }

    inject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let types = this.filter(modules);
        if (types.length) {
            types.forEach(ty => {
                this.setup(container, ty);
            });
        }
        return types;
    }
}

/**
 * module injector.
 *
 * @export
 * @class ModuleInjector
 * @implements {IModuleInjector}
 */
@Injectable(ModuleInjectorToken)
export class ModuleInjector extends BaseModuleInjector implements IModuleInjector {

    constructor(protected validate: IModuleValidate) {
        super(validate)
    }

    async inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        let types = this.filter(modules);
        if (types.length) {
            await PromiseUtil.forEach(types.map(ty => {
                return this.setup(container, ty);
            }));
        }
        return types;
    }
}
