import { IContainer } from '../IContainer';
import { Type } from '../types';
import { IModuleInjector, ModuleInjector } from './ModuleInjector';
import { PromiseUtil } from '../utils';
import { IocService } from './IocService';

/**
 * module Injector chian interface.
 *
 * @export
 * @interface IModuleInjectorChain
 */
export interface IModuleInjectorChain {
    /**
     * injector chain.
     *
     * @type {IModuleInjector[]}
     * @memberof IModuleInjectorChain
     */
    readonly injectors: IModuleInjector[];

    /**
     * set first step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorChain
     */
    first(injector: IModuleInjector): this;

    /**
     * set next step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorChain
     */
    next(injector: IModuleInjector): this;

    /**
     * inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Promise(Type<any>[]>}
     * @memberof IModuleInjectorChain
     */
    inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]>;

    /**
     * sync inject module.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleInjectorChain
     */
    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[];
}



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {IModuleInjectorChain}
 */
export class ModuleInjectorChain extends IocService implements IModuleInjectorChain {

    protected _injectors: IModuleInjector[];
    get injectors(): IModuleInjector[] {
        return this._injectors;
    }

    constructor() {
        super();
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
        return types;
    }
}

