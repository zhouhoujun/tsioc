import { isClassType, isNullOrUndefined, CTX_TARGET_TOKEN } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TOKEN } from '../../context-tokens';

export const ResolveServiceInClassChain = function (ctx: ResolveServiceContext, next?: () => void): void {
    let injector = ctx.injector;
    let tgtk = ctx.getValue(CTX_TARGET_TOKEN);
    if (isClassType(tgtk)) {
        ctx.reflects.getExtends(tgtk).some(ty => {
            ctx.instance = injector.resolve({ token: ctx.getValue(CTX_CURR_TOKEN), target: ty, tagOnly: true }, ctx.providers);
            return ctx.instance;
        });
    } else {
        ctx.instance = injector.resolve({ token: ctx.getValue(CTX_CURR_TOKEN), target: tgtk, tagOnly: true }, ctx.providers);
    }

    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};
