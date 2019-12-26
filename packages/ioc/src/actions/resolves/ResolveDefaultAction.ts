import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils/lang';

export class ResolveDefaultAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        let defaultTk = ctx.getOptions().default;
        if (defaultTk) {
            ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
        } else if (ctx.providers.has(ctx.token)) {
            ctx.instance = ctx.providers.get(ctx.token);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
