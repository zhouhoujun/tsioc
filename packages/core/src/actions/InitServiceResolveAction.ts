import { lang, isClass, Singleton, isFunction, isToken } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';

@Singleton
export class InitServiceResolveAction extends IocResolveServiceAction {
    execute(ctx: ServiceResolveContext, next: () => void): void {
        if (!ctx.targetType && ctx.target) {
            ctx.targetType = lang.getClass(ctx.target);
        }
        ctx.tokens = ctx.tokens || [];
        if (isFunction(ctx.serviceTokenFactory)) {
            ctx.tokens = ctx.tokens.concat(ctx.serviceTokenFactory(ctx.token) || []);
        }
        ctx.tokens = ctx.tokens.concat(...[ctx.token, isClass(ctx.token) ? ctx.token : ctx.getTokenProvider(ctx.token)]);
        ctx.tokens = ctx.tokens.filter(t => isToken(t));
        next();
    }
}
