import { ResolveServiceContext } from './ResolveServiceContext';
import { IocResolveServiceAction } from './IocResolveServiceAction';
import { CTX_CURR_TOKEN } from '../context-tokens';
import { isNullOrUndefined } from '@tsdi/ioc';


export class ResolveServiceTokenAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext, next: () => void): void {
        this.resolve(ctx, ctx.get(CTX_CURR_TOKEN) || ctx.token)
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
