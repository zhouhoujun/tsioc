
import { ModuelValidate } from './ModuleValidate';
import { Type, IocCoreService, PromiseUtil } from '@ts-ioc/ioc';
import { IContainer } from '../IContainer';
import { InjectorContext } from './InjectorContext';


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
     * @param {InjectorContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof IModuleInjector
     */
    inject(ctx: InjectorContext, next: () => Promise<void>): Promise<void>;
}




/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class BaseModuleInjector
 * @implements {IModuleInjector}
 */
export class ModuleInjector extends IocCoreService implements IModuleInjector {

    /**
     *Creates an instance of BaseModuleInjector.
     * @param {IModuleValidate} [validate]
     * @memberof BaseModuleInjector
     */
    constructor(protected validate?: ModuelValidate) {
        super();
    }

    async inject(ctx: InjectorContext, next: () => Promise<void>): Promise<void> {
        ctx.modules = ctx.modules || [];
        let types = ctx.modules.filter(ty => this.valid(ctx, ty));
        if (types.length) {
            await PromiseUtil.step(types.map(ty => () => this.setup(ctx.container, ty)));
        }
        this.setContext(ctx, types);
        if (ctx.modules.length) {
            await next()
        }
    }

    protected valid(ctx: InjectorContext, type: Type<any>): boolean {
        if (!this.validate) {
            return true;
        }
        return this.validate.valid(type);
    }

    protected setContext(ctx: InjectorContext, injected: Type<any>[]): void {
        if (injected && injected.length) {
            ctx.injected = ctx.injected || [];
            ctx.injected = ctx.injected.concat(injected);
            ctx.modules = ctx.modules.filter(it => injected.indexOf(it) < 0);
        }
    }

    protected async setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }

}
