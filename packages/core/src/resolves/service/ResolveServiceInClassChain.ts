import { isClassType, isNullOrUndefined, CTX_TARGET_TOKEN } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TOKEN } from '../../context-tokens';

export const ResolveServiceInClassChain = function (ctx: ResolveServiceContext, next?: () => void): void {
    let injector = ctx.injector;
    if (ctx.has(CTX_TARGET_TOKEN)) {
        let tgtk = ctx.get(CTX_TARGET_TOKEN);
        if (isClassType(tgtk)) {
            ctx.reflects.getExtends(tgtk).some(ty => {
                ctx.instance = injector.resolve({ token: ctx.get(CTX_CURR_TOKEN), target: ty }, ctx.providers);
                return ctx.instance;
            });
        } else {
            ctx.instance = injector.resolve({ token: ctx.get(CTX_CURR_TOKEN), target: tgtk }, ctx.providers);
        }
    } else {
        ctx.instance = injector.resolve({ token: ctx.get(CTX_CURR_TOKEN) }, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};
