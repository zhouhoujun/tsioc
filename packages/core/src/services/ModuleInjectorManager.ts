import { IModuleInjector, ModuleInjector } from './ModuleInjector';
import { IContainer } from '../IContainer';
import { Type, IocCoreService, PromiseUtil } from '@ts-ioc/ioc';
import { InjectorContext } from './InjectorContext';


/**
 * module Injector chian interface.
 *
 * @export
 * @interface IModuleInjectorManager
 */
export interface IModuleInjectorManager {
    /**
     * injector chain.
     *
     * @type {IModuleInjector[]}
     * @memberof IModuleInjectorManager
     */
    readonly injectors: IModuleInjector[];

    /**
     * set first step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorManager
     */
    first(injector: IModuleInjector): this;

    /**
     * set next step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorManager
     */
    next(injector: IModuleInjector): this;

    /**
     * inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Promise(Type<any>[]>}
     * @memberof IModuleInjectorManager
     */
    inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]>;
}



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class ModuleInjectorChain
 * @implements {IModuleInjectorManager}
 */
export class ModuleInjectorManager extends IocCoreService implements IModuleInjectorManager {

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
        let ctx: InjectorContext = {
            container: container,
            modules: modules
        };
        await PromiseUtil.runInChain(this.injectors.map(jtor => async (ctx: InjectorContext, next?: () => Promise<void>) => jtor.inject(ctx, next)), ctx);
        return ctx.injected || [];
    }
}

