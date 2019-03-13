import { isClass, Singleton, isFunction, isToken, isArray, lang } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { TargetService } from '../TargetService';

@Singleton
export class InitServiceResolveAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        if (ctx.target) {
            ctx.targetRefs = (isArray(ctx.target) ? ctx.target : [ctx.target])
                .map(t => {
                    if (t instanceof TargetService) {
                        return t;
                    } else if (t) {
                        return lang.getClass(t);
                    }
                    return null;
                })
                .filter(t => t);
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
