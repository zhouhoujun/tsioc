import { isClass, isNullOrUndefined } from '../../utils/lang';
import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';

export class ResolveInInjectorAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        let injector = ctx.injector;
        if (injector.has(ctx.token)) {
            ctx.instance = injector.get(ctx.token, ctx.providers);
        }

        if (isNullOrUndefined(ctx.instance)) {
            next();
        }

        if (isNullOrUndefined(ctx.instance) && ctx.getOptions().regify && isClass(ctx.token) && !injector.has(ctx.token)) {
            injector.register(ctx.token);
            ctx.instance = injector.get(ctx.token, ctx.providers);
        }
    }
}
