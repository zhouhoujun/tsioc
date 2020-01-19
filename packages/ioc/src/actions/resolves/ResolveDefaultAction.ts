import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';
import { CTX_DEFAULT_TOKEN } from '../../context-tokens';

export const ResolveDefaultAction = function (ctx: ResolveActionContext, next: () => void): void {
    if (ctx.hasValue(CTX_DEFAULT_TOKEN)) {
        ctx.instance = ctx.injector.get(ctx.default, ctx.providers);
    } else if (ctx.providers.has(ctx.token)) {
        ctx.instance = ctx.providers.get(ctx.token);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

