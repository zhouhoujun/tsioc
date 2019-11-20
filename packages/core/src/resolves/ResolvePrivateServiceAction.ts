import { InjectReference, ProviderMap, Token, isClassType, isNullOrUndefined } from '@tsdi/ioc';
import { ResolveServiceContext, CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TYPE } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';

export class ResolvePrivateServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        // resolve private service.
        this.resolvePrivate(ctx, ctx.getContext(CTX_CURR_TOKEN) || ctx.token);
        if (!ctx.instance) {
            next();
        }
    }

    protected resolvePrivate(ctx: ResolveServiceContext, token: Token) {
        if (ctx.hasContext(CTX_CURR_TARGET_REF) && ctx.hasContext(CTX_CURR_TARGET_TYPE)) {
            let tk = new InjectReference(ProviderMap, ctx.getContext(CTX_CURR_TARGET_TYPE));
            if (tk !== token) {
                let map = this.container.has(tk) ? this.container.get(tk) : null;
                if (map && map.has(token)) {
                    ctx.instance = map.resolve(token, ...ctx.providers);
                }
                if (ctx.extend && isNullOrUndefined(ctx.instance) && isClassType(token)) {
                    let extk = map.keys().find(k => isClassType(k) && ctx.reflects.isExtends(k, token));
                    if (extk) {
                        ctx.instance = map.resolve(extk, ...ctx.providers);
                    }
                }
            }
        }
    }
}
