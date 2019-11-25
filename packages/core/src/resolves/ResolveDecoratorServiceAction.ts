import { DecoratorProvider, CTX_CURR_DECOR } from '@tsdi/ioc';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TARGET_TYPE, CTX_CURR_TOKEN } from '../context-tokens';

export class ResolveDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.has(CTX_CURR_TARGET_TYPE)) {
            let dprvoider = this.container.getInstance(DecoratorProvider);
            ctx.reflects.getDecorators(ctx.get(CTX_CURR_TARGET_TYPE), 'class')
                .some(dec => {
                    if (dprvoider.has(dec)) {
                        ctx.instance = dprvoider.resolve(dec, ctx.get(CTX_CURR_TOKEN) || ctx.token, ...ctx.providers || []);
                        return !!ctx.instance;
                    } else {
                        return false;
                    }
                });
        }

        if (!ctx.instance) {
            ctx.remove(CTX_CURR_DECOR);
            return next();
        }
    }
}
