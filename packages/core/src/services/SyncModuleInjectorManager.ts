import { IContainer } from '../IContainer';
import { Type, IocCoreService, lang } from '@ts-ioc/ioc';
import { InjectorContext } from './InjectorContext';
import { ISyncModuleInjector, SyncModuleInjector } from './SyncModuleInjector';


/**
 * module Injector chian interface.
 *
 * @export
 * @interface ISyncModuleInjectorManager
 */
export interface ISyncModuleInjectorManager {
    /**
     * injector chain.
     *
     * @type {ISyncModuleInjector[]}
     * @memberof ISyncModuleInjectorManager
     */
    readonly injectors: ISyncModuleInjector[];

    /**
     * set first step.
     *
     * @param {ISyncModuleInjector} injector
     * @memberof ISyncModuleInjectorManager
     */
    first(injector: ISyncModuleInjector): this;

    /**
     * set next step.
     *
     * @param {ISyncModuleInjector} injector
     * @memberof ISyncModuleInjectorManager
     */
    next(injector: ISyncModuleInjector): this;

    /**
     * inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof ISyncModuleInjectorManager
     */
    inject(container: IContainer, modules: Type<any>[]): Type<any>[];
}



/**
 * Module Injector chain, base injector chain.
 *
 * @export
 * @class SyncModuleInjectorManager
 * @implements {ISyncModuleInjectorManager}
 */
export class SyncModuleInjectorManager extends IocCoreService implements ISyncModuleInjectorManager {

    protected _injectors: ISyncModuleInjector[];
    get injectors(): ISyncModuleInjector[] {
        return this._injectors;
    }

    constructor() {
        super();
        this._injectors = [];
    }

    first(injector: ISyncModuleInjector) {
        if (this.isInjector(injector)) {
            this._injectors.unshift(injector);
        }
        return this;
    }

    next(injector: ISyncModuleInjector) {
        if (this.isInjector(injector)) {
            this._injectors.push(injector);
        }
        return this;
    }

    protected isInjector(injector: ISyncModuleInjector) {
        return injector instanceof SyncModuleInjector;
    }

    inject(container: IContainer, modules: Type<any>[]): Type<any>[] {
        let ctx: InjectorContext = {
            container: container,
            modules: modules
        };
        lang.execAction(this.injectors.map(jtor => (ctx: InjectorContext, next?: () => void) => jtor.inject(ctx, next)), ctx);
        return ctx.injected || [];
    }
}

