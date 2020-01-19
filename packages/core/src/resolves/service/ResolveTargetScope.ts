import { IocResolveScope, IActionSetup, CTX_TARGET_TOKEN, isToken, lang } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';
import { CTX_TARGET_REFS, CTX_CURR_TOKEN } from '../../context-tokens';


export class ResolveTargetScope extends IocResolveScope<ResolveServiceContext> implements IActionSetup {

    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.hasValue(CTX_TARGET_REFS)) {
            ctx.getValue(CTX_TARGET_REFS).some(t => {
                let tgtk = isToken(t) ? t : lang.getClass(t);
                ctx.set(CTX_TARGET_TOKEN, tgtk);
                return ctx.tokens.some(tk => {
                    ctx.set(CTX_CURR_TOKEN, tk);
                    super.execute(ctx);
                    return !!ctx.instance;
                });
            });

            ctx.remove(CTX_CURR_TOKEN, CTX_TARGET_TOKEN);
        }
        if (!ctx.instance) {
            next && next();
        }
    }

    setup() {
        this.use(ResolveServiceInClassChain)
            .use(ResolveDecoratorServiceAction);
    }
}
