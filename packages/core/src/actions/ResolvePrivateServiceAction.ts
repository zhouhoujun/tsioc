import { InjectReference, ProviderMap, Singleton, Token } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';

@Singleton
export class ResolvePrivateServiceAction extends IocResolveServiceAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        // resolve private service.
        this.resolvePrivate(ctx, ctx.token);
        if (!ctx.instance) {
            next();
        }
    }

    protected resolvePrivate(ctx: ServiceResolveContext, token: Token<any>) {
        if (ctx.targetType) {
            let tk = new InjectReference(ProviderMap, ctx.targetType);
            if (tk !== token) {
                let map = ctx.has(tk) ? ctx.resolve(tk) : null;
                if (map && map.has(token)) {
                    ctx.instance = map.resolve(token, ...ctx.providers);
                }
            }
        }
    }
}
