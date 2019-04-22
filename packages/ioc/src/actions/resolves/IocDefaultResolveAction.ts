import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { isNullOrUndefined } from '../../utils';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResolveActionContext<any>, next: () => void): void {
        if (!ctx.instance && this.container.has(ctx.token)) {
            ctx.instance = this.container.get(ctx.token, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
