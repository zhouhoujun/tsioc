import { InjectReference, Token, isClassType, isNullOrUndefined, InjectorToken } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { CTX_CURR_TOKEN, CTX_CURR_TARGET_REF, CTX_CURR_TARGET_TYPE } from '../context-tokens';

export class ResolvePrivateServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        // resolve private service.
        this.resolvePrivate(ctx, ctx.get(CTX_CURR_TOKEN) || ctx.token);
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }

    protected resolvePrivate(ctx: ResolveServiceContext, token: Token) {
        if (ctx.has(CTX_CURR_TARGET_REF) && ctx.has(CTX_CURR_TARGET_TYPE)) {
            let tk = new InjectReference(InjectorToken, ctx.get(CTX_CURR_TARGET_TYPE));
            if (tk !== token) {
                let map = ctx.injector.has(tk) ? ctx.injector.get(tk) : null;
                if (map && map.has(token)) {
                    ctx.instance = map.resolve(token, ctx.providers);
                }
                if (ctx.getOptions().extend && isNullOrUndefined(ctx.instance) && isClassType(token)) {
                    let extk = map.keys().find(k => isClassType(k) && ctx.reflects.isExtends(k, token));
                    if (extk) {
                        ctx.instance = map.resolve(extk, ctx.providers);
                    }
                }
            }
        }
    }
}
