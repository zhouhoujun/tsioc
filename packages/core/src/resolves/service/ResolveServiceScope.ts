import { IocResolveScope, IActionSetup, lang, isToken, CTX_TARGET_TOKEN } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';
import { CTX_CURR_TOKEN, CTX_TARGET_REFS } from '../../context-tokens';

export class ResolveServiceScope extends IocResolveScope<ResolveServiceContext> implements IActionSetup {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.instance || !ctx.tokens || !ctx.tokens.length) {
            return;
        }
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
        this.clear(ctx);
        if (!has) {
            next && next();

            if (!ctx.instance) {
                // after all resolve default.
                let defaultTk = ctx.getOptions().default;
                if (defaultTk) {
                    ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
                }
            }
        }

        // after all clean.
        (async () => {
            ctx.clear();
        })()
    }

    protected clear(ctx: ResolveServiceContext) {
        ctx.remove(CTX_CURR_TOKEN, CTX_TARGET_TOKEN);
    }

    setup() {
        this.use(ResolveServiceInClassChain)
            .use(ResolveDecoratorServiceAction);
    }
}
