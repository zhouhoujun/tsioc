import { IocResolveScope, IActionSetup, lang, isToken, CTX_TARGET_TOKEN } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';
import { CTX_CURR_TOKEN, CTX_TARGET_REFS } from '../../context-tokens';

export class ResolveServiceScope extends IocResolveScope<ResolveServiceContext> implements IActionSetup {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        let has: boolean;
        if (ctx.has(CTX_TARGET_REFS)) {
            has = ctx.get(CTX_TARGET_REFS).some(t => {
                let tgtk = isToken(t) ? t : lang.getClass(t);
                ctx.set(CTX_TARGET_TOKEN, tgtk);
                return ctx.tokens.some(tk => {
                    ctx.set(CTX_CURR_TOKEN, tk);
                    super.execute(ctx);
                    return !!ctx.instance;
                });
            });
        } else {
            has = ctx.tokens.some(tk => {
                ctx.set(CTX_CURR_TOKEN, tk);
                super.execute(ctx);
                return !!ctx.instance;
            });
        }

        if (has) {
            this.clear(ctx);
            next && next();
        }
    }

    protected clear(ctx: ResolveServiceContext) {
        ctx.remove(CTX_CURR_TOKEN, CTX_TARGET_TOKEN);
    }

    setup() {
        this.use(ResolveServiceInClassChain)
            .use(ResolveDecoratorServiceAction);
    }
}
