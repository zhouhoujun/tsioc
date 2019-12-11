import { isClass } from '../../utils/lang';
import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        let injector = ctx.injector;
        if (!ctx.instance && injector.has(ctx.token)) {
            ctx.instance = injector.get(ctx.token, ctx.providers);
        }

        if (!ctx.instance) {
            next();
        }

        if (!ctx.instance && ctx.getOptions().regify && isClass(ctx.token) && !injector.has(ctx.token)) {
            injector.register(ctx.token);
            ctx.instance = injector.get(ctx.token, ctx.providers);
        }
    }
}
