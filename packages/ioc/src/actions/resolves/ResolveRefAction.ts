import { ResolveActionContext } from '../ResolveActionContext';
import { InjectReference } from '../../InjectReference';
import { isNullOrUndefined } from '../../utils/lang';
import { CTX_TARGET_TOKEN } from '../../context-tokens';


export const ResolveRefAction = function (ctx: ResolveActionContext, next: () => void): void {
    if (ctx.hasValue(CTX_TARGET_TOKEN)) {
        let tk = new InjectReference(ctx.token, ctx.getValue(CTX_TARGET_TOKEN));
        ctx.instance = ctx.injector.get(tk, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance) && !ctx.getOptions().tagOnly) {
        next();
    }
};
