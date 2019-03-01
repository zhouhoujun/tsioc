import { Type } from '../types';
import { IIocContainer } from '../IIocContainer';
import { PromiseUtil } from '../utils';
import { ModuelValidate } from './ModuleValidate';
import { IocService } from './IocService';

/**
 *  InjectorResult
 *
 * @export
 * @interface InjectorResult
 */
export interface InjectorResult {
    injected: Type<any>[];
    next?: Type<any>[];
}

/**
 * module injector.
 *
 * @export
 * @interface IModuleInjector
 */
export interface IModuleInjector {
    /**
     * inject module to container.
     *
     * @param {IIocContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleInjector
     */
    inject(container: IIocContainer, modules: Type<any>[]): Promise<InjectorResult>;

    /**
     * sync inject module.
     *
     * @param {IIocContainer} container
     * @param {Type<any>[]} modules
     * @returns {InjectorResult}
     * @memberof IModuleInjector
     */
    syncInject(container: IIocContainer, modules: Type<any>[]): InjectorResult;
}


/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class BaseModuleInjector
 * @implements {IModuleInjector}
 */
export class ModuleInjector extends IocService implements IModuleInjector {

    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @param {boolean} [skipNext] skip next when has match module to injector.
     * @memberof BaseModuleInjector
     */
    constructor(protected validate?: ModuelValidate, protected skipNext?: boolean) {
        super();
    }

    async inject(container: IIocContainer, modules: Type<any>[]): Promise<InjectorResult> {
        let types = (modules || []).filter(ty => this.valid(container, ty));
        if (types.length) {
            await PromiseUtil.step(types.map(ty => () => this.setup(container, ty)));
        }
        let next = this.getNext(modules, types);
        return { injected: types, next: next };
    }

    syncInject(container: IIocContainer, modules: Type<any>[]): InjectorResult {
        let types = (modules || []).filter(ty => this.valid(container, ty));
        if (types.length) {
            types.forEach(ty => {
                this.syncSetup(container, ty);
            });
        }
        let next = this.getNext(modules, types);
        return { injected: types, next: next };
    }

    protected valid(container: IIocContainer, type: Type<any>): boolean {
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

    protected async setup(container: IIocContainer, type: Type<any>) {
        container.register(type);
    }
    protected syncSetup(container: IIocContainer, type: Type<any>) {
        container.register(type);
    }
}
