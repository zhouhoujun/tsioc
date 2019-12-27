import { DecoratorProvider, isNullOrUndefined, IocResolveAction, isClassType, CTX_TARGET_TOKEN } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TOKEN } from '../../context-tokens';

export class ResolveDecoratorServiceAction extends IocResolveAction<ResolveServiceContext>  {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.has(CTX_TARGET_TOKEN)) {
            let dprvoider = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
            let clasType = ctx.get(CTX_TARGET_TOKEN);
            if (isClassType(clasType)) {
                ctx.reflects.getDecorators(clasType, 'class')
                    .some(dec => {
                        if (dprvoider.has(dec)) {
                            ctx.instance = dprvoider.resolve(dec, ctx.get(CTX_CURR_TOKEN) || ctx.token, ctx.providers);
                            return !!ctx.instance;
                        } else {
                            return false;
                        }
                    });
            }
        }

        if (isNullOrUndefined(ctx.instance)) {
            return next();
        }
    }
}
