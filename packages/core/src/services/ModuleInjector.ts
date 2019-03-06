import {
    Type, IocCoreService, PromiseUtil, isClass,
    isString, hasOwnClassMetadata, isArray
} from '@ts-ioc/ioc';
import { IContainer } from '../IContainer';


/**
 * injector context.
 *
 * @export
 * @interface InjectorContext
 */
export interface InjectorContext {
    /**
     * the modules to injector.
     *
     * @type {Type<any>[]}
     * @memberof InjectorContext
     */
    modules: Type<any>[];
    /**
     * the container modules inject to.
     *
     * @type {IContainer}
     * @memberof InjectorContext
     */
    container: IContainer;
    /**
     * injected modules.
     *
     * @type {Type<any>[]}
     * @memberof InjectorContext
     */
    injected: Type<any>[];
}

/**
 * base module injector. abstract class.
 *
 * @export
 * @abstract
 * @class ModuleInjector
 * @implements {IModuleInjector}
 */
export class ModuleInjector extends IocCoreService {

    /**
     * inject module to container.
     *
     * @param {InjectorContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof ModuleInjector
     */
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

    /**
     * inject module to container.
     *
     * @param {InjectorContext} ctx
     * @param {() => void} next
     * @memberof ModuleInjector
     */
    syncInject(ctx: InjectorContext, next: () => void): void {
        ctx.modules = ctx.modules || [];
        let types = ctx.modules.filter(ty => this.valid(ctx, ty));
        if (types.length) {
            types.forEach(ty => this.setup(ctx.container, ty));
        }
        this.setContext(ctx, types);
        if (ctx.modules.length) {
            next()
        }
    }

    getDecorator(): string | string[] {
        return null;
    }

    protected valid(ctx: InjectorContext, type: Type<any>): boolean {
        if (!isClass(type)) {
            return false;
        }

        let decorator = this.getDecorator();
        if (isString(decorator)) {
            return hasOwnClassMetadata(decorator, type);
        } else if (isArray(decorator)) {
            return decorator.some(d => hasOwnClassMetadata(d, type));
        }
        return true;
    }

    protected setContext(ctx: InjectorContext, injected: Type<any>[]): void {
        if (injected && injected.length) {
            ctx.injected = ctx.injected.concat(injected);
            ctx.modules = ctx.modules.filter(it => injected.indexOf(it) < 0);
        }
    }

    protected async setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }

    protected syncSetup(container: IContainer, type: Type<any>) {
        container.register(type);
    }

}

export type ModuleInjectorType = ModuleInjector | Type<ModuleInjector>;
