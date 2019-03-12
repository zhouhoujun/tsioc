import { ServiceResolveContext } from './ServiceResolveContext';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ResolveDefaultServiceAction extends ResolvePrivateServiceAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx.defaultToken) {
            this.resolvePrivate(ctx, ctx.defaultToken);
            if (!ctx.instance && ctx.has(ctx.defaultToken)) {
                ctx.instance = ctx.resolve(ctx.defaultToken, ...ctx.providers);
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
