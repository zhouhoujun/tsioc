import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { InjectReference } from '../../InjectReference';
import { InjectorToken } from '../../IInjector';
import { lang, isNullOrUndefined } from '../../utils/lang';


export class ResolvePrivateAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        if (ctx.getOptions().target) {
            let tk = new InjectReference(InjectorToken, lang.getClass(ctx.getOptions().target));
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
