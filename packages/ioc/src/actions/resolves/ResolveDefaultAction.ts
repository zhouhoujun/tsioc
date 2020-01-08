import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';

export const ResolveDefaultAction = function (ctx: ResolveActionContext, next: () => void): void {
    let defaultTk = ctx.getOptions().default;
    if (defaultTk) {
        ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
    } else if (ctx.providers.has(ctx.token)) {
        ctx.instance = ctx.providers.get(ctx.token);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

