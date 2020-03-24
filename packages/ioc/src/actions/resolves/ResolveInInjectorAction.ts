import { isNullOrUndefined } from '../../utils/lang';
import { ResolveContext } from '../ResolveActionContext';

export const ResolveInInjectorAction = function (ctx: ResolveContext, next: () => void): void {
    let injector = ctx.injector;
    if (injector.has(ctx.token)) {
        ctx.instance = injector.get(ctx.token, ctx.providers);
    }

    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};
