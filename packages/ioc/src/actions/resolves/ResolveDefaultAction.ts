import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';
import { CTX_DEFAULT_TOKEN } from '../../context-tokens';

export const ResolveDefaultAction = function (ctx: ResolveActionContext, next: () => void): void {
    if (ctx.providers.has(ctx.token)) {
        ctx.instance = ctx.providers.get(ctx.token);
    }
    if (isNullOrUndefined(ctx.instance) && ctx.hasValue(CTX_DEFAULT_TOKEN)) {
        ctx.instance = ctx.injector.get(ctx.defaultToken, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

