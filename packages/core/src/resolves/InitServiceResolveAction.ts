import { isToken, isArray, lang, isClassType, isClass, CTX_RESOLVE_REGIFY } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { TargetService } from '../TargetService';
import { ResolveServicesContext } from './ResolveServicesContext';
import { CTX_TARGET_REFS, CTX_SERVICE_TOKEN_FACTORY } from '../contextTokens';

export class InitServiceResolveAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.target) {
            ctx.setContext(CTX_TARGET_REFS, (isArray(ctx.target) ? ctx.target : [ctx.target])
                .map(t => {
                    if (t instanceof TargetService) {
                        return t;
                    } else if (t) {
                        return isToken(t) ? t : lang.getClass(t);
                    }
                    return null;
                })
                .filter(t => t));
        }
        ctx.tokens = ctx.tokens || [];
        if (ctx.token) {
            if (ctx.hasContext(CTX_SERVICE_TOKEN_FACTORY)) {
                ctx.tokens = (ctx.getContext(CTX_SERVICE_TOKEN_FACTORY)(ctx.token) || []).concat(ctx.tokens);
            } else {
                ctx.tokens.push(ctx.token);
            }
        }

        if (ctx instanceof ResolveServicesContext) {
            ctx.tokens = ctx.tokens.filter(t => isToken(t));
            ctx.types = ctx.types || [];
            ctx.types = ctx.tokens.map(t => isClassType(t) ? t : this.container.getTokenProvider(t))
                .concat(ctx.types).filter(ty => isClassType(ty));
            return next();

        } else {
            if (!isClassType(ctx.token)) {
                let pdType = this.container.getTokenProvider(ctx.token);
                if (pdType) {
                    ctx.tokens.push(pdType);
                }
            }
            ctx.tokens = ctx.tokens.filter(t => isToken(t));
            next();

            if (!ctx.instance && ctx.getContext(CTX_RESOLVE_REGIFY) && isClass(ctx.token) && !this.container.has(ctx.token)) {
                this.container.register(ctx.token);
                ctx.instance = this.container.get(ctx.token, ...ctx.providers);
            }
            // resolve default.
            if (!ctx.instance && ctx.defaultToken) {
                this.resolve(ctx, ctx.defaultToken);
            }
        }
    }
}
