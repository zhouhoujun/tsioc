import { IocResolveAction, lang, InjectReference, ProviderMap } from '@ts-ioc/ioc';
import { ServiceResolveContext } from '../ServiceResolveContext';


export class RefServiceResolveAction extends IocResolveAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx instanceof ServiceResolveContext && ctx.target) {
            if (ctx.targetType) {
                let tokens = [ctx.tokenKey, ctx.tokenType];
                lang.forInClassChain(ctx.targetType, ty => {
                    let prdMap = ctx.resolve(new InjectReference(ProviderMap, ty));
                    return !tokens.some(tk => {
                        if (prdMap.has(tk)) {
                            ctx.instance = prdMap.resolve(tk, ...ctx.providers);
                        }
                        if (!ctx.instance) {

                        }
                        return !!ctx.instance;
                    });
                });
            }
        } else {
            next();
        }
    }
}
