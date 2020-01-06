import { DecoratorProvider, isNullOrUndefined, IocResolveAction, isClassType, CTX_TARGET_TOKEN, InjectReference } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TOKEN } from '../../context-tokens';

export class ResolveDecoratorServiceAction extends IocResolveAction<ResolveServiceContext>  {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.has(CTX_TARGET_TOKEN)) {
            let dprvoider = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
            let clasType = ctx.get(CTX_TARGET_TOKEN);
            if (isClassType(clasType)) {
                let tk = ctx.get(CTX_CURR_TOKEN) || ctx.token;
                ctx.reflects.getDecorators(clasType)
                    .some(dec => {
                        if (dprvoider.has(dec, tk)) {
                            ctx.instance = dprvoider.resolve(dec, tk, ctx.providers);
                        }
                        if (ctx.instance) {
                            return true;
                        }
                        let refDec = new InjectReference(tk, dec);
                        if (ctx.injector.hasRegister(refDec)) {
                            ctx.instance = ctx.injector.get(refDec, ctx.providers);
                        }
                        return !!ctx.instance;
                    });
            }
        }

        if (isNullOrUndefined(ctx.instance)) {
            return next();
        }
    }
}
