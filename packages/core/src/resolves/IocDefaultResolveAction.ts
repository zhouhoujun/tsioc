import { isNullOrUndefined, Singleton } from '@tsdi/ioc';
import { ResovleActionContext } from './ResovleActionContext';
import { IocResolveAction } from './IocResolveAction';

@Singleton
export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResovleActionContext, next: () => void): void {
        if (this.container.has(ctx.token)) {
            ctx.instance = this.container.resolve(ctx.token, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
