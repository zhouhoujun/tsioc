import { IocResolveAction, lang, isClass } from '@ts-ioc/ioc';
import { ServiceResolveContext } from '../ServiceResolveContext';

export class InitServiceResolveAction extends IocResolveAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (ctx instanceof ServiceResolveContext) {
            if (!ctx.targetType && ctx.target) {
                ctx.targetType = lang.getClass(ctx.target);
            }
            if (!ctx.tokenType) {
                ctx.tokenType = isClass(ctx.tokenKey) ? ctx.tokenKey : ctx.raiseContainer.getTokenProvider(ctx.tokenKey);
            }
        }
        next();
    }
}
