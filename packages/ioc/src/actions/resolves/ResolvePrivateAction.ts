import { ResolveContext } from '../ResolveActionContext';
import { InjectReference } from '../../InjectReference';
import { PROVIDERS } from '../../IInjector';
import { isNullOrUndefined } from '../../utils/lang';
import { CTX_TARGET_TOKEN } from '../../context-tokens';


export const ResolvePrivateAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.hasValue(CTX_TARGET_TOKEN)) {
        let tk = new InjectReference(PROVIDERS, ctx.getValue(CTX_TARGET_TOKEN));
        let privPdr = ctx.injector.get(tk);
        if (privPdr && privPdr.has(ctx.token)) {
            ctx.instance = privPdr.get(ctx.token, ctx.providers);
        }
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

