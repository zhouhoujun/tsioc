import { IocResolveAction } from './Action';
import { isNullOrUndefined } from '../utils';
import { ResovleContext } from '../ResovleContext';

export class IocDefaultResolveAction extends IocResolveAction {
    execute(ctx: ResovleContext, next: () => void): void {
        if (ctx.has(ctx.tokenKey)) {
            ctx.instance = ctx.get(ctx.tokenKey, ...ctx.providers);
        }
        if (isNullOrUndefined(ctx.instance)) {
            next();
        }
    }
}
