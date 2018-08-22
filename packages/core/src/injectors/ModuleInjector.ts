import { IModuleInjector } from './IModuleInjector';
import { Type, Express } from '../types';
import { IContainer } from '../IContainer';
import { PromiseUtil } from '../utils';

/**
 * sync module injector.
 *
 * @export
 * @class ModuleInjector
 * @implements {IModuleInjector}
 */
export class SyncModuleInjector implements IModuleInjector {

    constructor(protected filter?: Express<Type<any>, boolean>) {

    }

    inject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        modules = modules || [];
        let types = this.filter ? modules.filter(this.filter) : modules;
        if (types.length) {
            types.forEach(ty => {
                this.setup(container, ty);
            });
        }
        return types;
    }

    protected setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}

/**
 * module injector.
 *
 * @export
 * @class ModuleInjector
 * @implements {IModuleInjector}
 */
export class ModuleInjector implements IModuleInjector {

    constructor(protected filter?: Express<Type<any>, boolean>) {

    }

    async inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]> {
        modules = modules || [];
        let types = this.filter ? modules.filter(this.filter) : modules;
        if (types.length) {
            await PromiseUtil.forEach(types.map(ty => {
                return this.setup(container, ty);
            }));
        }
        return types;
    }

    protected async setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}
