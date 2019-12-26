import { IocResolveAction } from '../IocResolveAction';
import { ResolveActionContext } from '../ResolveActionContext';
import { InjectReference } from '../../InjectReference';
import { isNullOrUndefined } from '../../utils/lang';
import { isToken } from '../../utils/isToken';


export class ResolveRefAction extends IocResolveAction {
    execute(ctx: ResolveActionContext, next: () => void): void {
        let target = ctx.getOptions().target;
        if (isToken(target)) {
            let tk = new InjectReference(ctx.token, target);
            ctx.instance = ctx.injector.get(tk, ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
