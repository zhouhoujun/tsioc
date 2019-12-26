import { isToken, isArray, lang, isClassType, isClass, isNullOrUndefined, IocResolveAction } from '@tsdi/ioc';
import { ResolveServicesContext, ServicesOption } from './ResolveServicesContext';
import { CTX_TARGET_REFS } from '../../context-tokens';

export class InitServicesResolveAction extends IocResolveAction<ResolveServicesContext> {
    execute(ctx: ResolveServicesContext, next: () => void): void {
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

        options.tokens = options.tokens.filter(t => isToken(t));
        let ssoption = options as ServicesOption<any>;
        ssoption.types = ssoption.types || [];
        ssoption.types = ctx.tokens.map(t => isClassType(t) ? t : injector.getTokenProvider(t))
            .concat(ssoption.types).filter(ty => isClassType(ty));
        return next();


    }
}
