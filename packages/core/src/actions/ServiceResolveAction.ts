import { IocResolveAction } from '@ts-ioc/ioc';
import { ServiceResolveContext } from '../ServiceResolveContext';


export class ServiceResolveAction extends IocResolveAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx instanceof ServiceResolveContext) {
            if (ctx.has(ctx.tokenKey)) {
                ctx.instance = ctx.get(ctx.tokenKey, ...ctx.providers);
            }
        } else {
            next();
        }
    }
}
