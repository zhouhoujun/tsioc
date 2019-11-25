import { IocResolveScope, isToken, isClassType } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';
import { CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TYPE, CTX_CURR_TARGET_TOKEN, CTX_TARGET_REFS } from '../context-tokens';

export class ResolveTargetServiceAction extends IocResolveScope<ResolveServiceContext> {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (!ctx.instance && ctx.has(CTX_TARGET_REFS)) {
            let has = ctx.get(CTX_TARGET_REFS).some(t => {
                ctx.set(CTX_CURR_TARGET_REF, t);
                let tk = isToken(t) ? t : t.getToken();
                ctx.set(CTX_CURR_TARGET_TOKEN, tk);
                let ty = isClassType(tk) ? tk : this.container.getTokenProvider(tk);
                isClassType(ty) ? ctx.set(CTX_CURR_TARGET_TYPE, ty) : ctx.remove(CTX_CURR_TARGET_TYPE);
                return ctx.tokens.some(tk => {
                    ctx.set(CTX_CURR_TOKEN, tk);
                    super.execute(ctx);
                    return !!ctx.instance;
                })
            });
            if (!has) {
                this.clear(ctx);
                next && next();
            }
        } else {
            next && next();
        }
    }

    protected clear(ctx: ResolveServiceContext) {
        ctx.remove(CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TYPE, CTX_CURR_TARGET_TOKEN);
    }

    setup() {
        this.use(ResolveServiceInClassChain, true)
            .use(ResolveDecoratorServiceAction);
    }
}
