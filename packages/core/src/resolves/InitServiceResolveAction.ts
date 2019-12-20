import { isToken, isArray, lang, isClassType, isClass, isNullOrUndefined } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { TargetService } from '../TargetService';
import { ResolveServicesContext, ServicesOption } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from '../context-tokens';

export class InitServiceResolveAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        let options = ctx.getOptions();
        if (ctx.target) {
            ctx.set(CTX_TARGET_REFS, (isArray(ctx.target) ? ctx.target : [ctx.target])
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
        options.tokens = options.tokens || [];
        let injector = ctx.injector;
        if (ctx.token) {
            if (options.serviceTokenFactory) {
                options.tokens = (options.serviceTokenFactory(ctx.token) || []).concat(options.tokens);
            } else {
                ctx.tokens.push(ctx.token);
            }
        }

        if (ctx instanceof ResolveServicesContext) {
            options.tokens = options.tokens.filter(t => isToken(t));
            let ssoption = options as ServicesOption<any>;
            ssoption.types = ssoption.types || [];
            ssoption.types = ctx.tokens.map(t => isClassType(t) ? t : injector.getTokenProvider(t))
                .concat(ssoption.types).filter(ty => isClassType(ty));
            return next();

        } else {
            if (!isClassType(ctx.token)) {
                let pdType = injector.getTokenProvider(ctx.token);
                if (pdType) {
                    options.tokens.push(pdType);
                }
            }
            options.tokens = options.tokens.filter(t => isToken(t));
            next();

            if (isNullOrUndefined(ctx.instance) && options.regify && isClass(ctx.token) && !injector.has(ctx.token)) {
                injector.register(ctx.token);
                ctx.instance = injector.get(ctx.token, ctx.providers);
            }
            // resolve default.
            if (isNullOrUndefined(ctx.instance) && ctx.defaultToken) {
                this.resolve(ctx, ctx.defaultToken);
            }
        }
    }
}
