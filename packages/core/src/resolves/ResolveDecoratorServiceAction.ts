import { DecoratorProvider, CTX_CURR_DECOR } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext, CTX_CURR_TARGET_TYPE, CTX_CURR_TOKEN } from './ResolveServiceContext';

export class ResolveDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.hasContext(CTX_CURR_TARGET_TYPE)) {
            let dprvoider = this.container.getInstance(DecoratorProvider);
            ctx.reflects.getDecorators(ctx.getContext(CTX_CURR_TARGET_TYPE), 'class')
                .some(dec => {
                    if (dprvoider.has(dec)) {
                        ctx.instance = dprvoider.resolve(dec, ctx.getContext(CTX_CURR_TOKEN) || ctx.token, ...ctx.providers || []);
                        return !!ctx.instance;
                    } else {
                        return false;
                    }
                });
        }

        if (!ctx.instance) {
            ctx.removeContext(CTX_CURR_DECOR);
            return next();
        }
    }
}
