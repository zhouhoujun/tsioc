import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ResolveDefaultServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.defaultToken) {
           this.resolve(ctx, ctx.currToken || ctx.token);
        }
        if (!ctx.instance) {
            next();
        }
    }
}
