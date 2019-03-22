import { ResolveServiceContext } from './ResolveServiceContext';
import { Singleton } from '@ts-ioc/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';

@Singleton
export class ResolveServiceTokenAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.currToken || ctx.token);
        if (!ctx.instance) {
            next();
        }
    }
}


@Singleton
export class ResolveDefaultServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.defaultToken) {
            this.resolve(ctx, ctx.defaultToken);
        }
        if (!ctx.instance) {
            next();
        }
    }
}
