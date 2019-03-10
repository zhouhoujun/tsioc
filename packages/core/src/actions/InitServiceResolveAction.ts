import { lang, isClass, Singleton } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';

@Singleton
export class InitServiceResolveAction extends IocResolveServiceAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (!ctx.targetType && ctx.target) {
            ctx.targetType = lang.getClass(ctx.target);
        }
        if (!ctx.tokenType) {
            ctx.tokenType = isClass(ctx.token) ? ctx.token : ctx.getTokenProvider(ctx.token);
        }
        next();
    }
}
