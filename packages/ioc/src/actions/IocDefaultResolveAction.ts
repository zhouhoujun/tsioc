import { isNullOrUndefined } from '../utils';
import { ResovleContext } from './ResovleContext';
import { IocResolveAction } from './IocResolveAction';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResovleContext, next: () => void): void {
        if (ctx.has(ctx.token)) {
            ctx.instance = ctx.resolve(ctx.token, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
