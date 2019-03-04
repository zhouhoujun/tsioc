import { IContainer } from '../IContainer';
import { InjectorContext } from './InjectorContext';
import { IocCoreService, Type } from '@ts-ioc/ioc';
import { ModuelValidate } from './ModuleValidate';

export interface ISyncModuleInjector {

    /**
     * inject module to container.
     *
     * @param {InjectorContext} ctx
     * @param {() => void} next
     * @memberof ISyncModuleInjector
     */
    inject(ctx: InjectorContext, next: () => void): void;
}

export class SyncModuleInjector extends IocCoreService implements ISyncModuleInjector {

    constructor(protected validate?: ModuelValidate) {
        super();
    }

    inject(ctx: InjectorContext, next: () => void): void {
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

    protected setup(container: IContainer, type: Type<any>) {
        container.register(type);
    }
}