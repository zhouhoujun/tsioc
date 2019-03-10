import { IocResolveAction, InjectReference, ProviderMap } from '@ts-ioc/ioc';
import { ServiceResolveContext } from '../ServiceResolveContext';


export class ServiceResolveAction extends IocResolveAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx instanceof ServiceResolveContext) {
            // resolve private service.
            if (ctx.targetType) {
                let tk = new InjectReference(ProviderMap, ctx.targetType);
                let map = ctx.has(tk) ? ctx.resolve(tk) : null;
                if (map && map.has(ctx.token)) {
                    ctx.instance = map.resolve(ctx.token, ...ctx.providers);
                }
            }
            if (!ctx.instance && ctx.has(ctx.token)) {
                ctx.instance = ctx.resolve(ctx.token, ...ctx.providers);
            }
        } else {
            next();
        }
    }
}
