import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { InjectReference } from '../../InjectReference';
import { InjectorToken } from '../../IInjector';
import { isNullOrUndefined } from '../../utils/lang';
import { CTX_TARGET_TOKEN } from '../../context-tokens';


export class ResolvePrivateAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        if (ctx.has(CTX_TARGET_TOKEN)) {
            let tk = new InjectReference(InjectorToken, ctx.get(CTX_TARGET_TOKEN));
            let privPdr = ctx.injector.get(tk);
            if (privPdr && privPdr.has(ctx.token)) {
                ctx.instance = privPdr.get(ctx.token, ctx.providers);
            }
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
