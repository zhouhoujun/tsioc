import { IocRaiseContext } from './Action';
import { IocCompositeAction } from './IocCompositeAction';
import { InjectToken } from '../InjectToken';

export const CTX_ACTION_SCOPE = new InjectToken<any>('CTX_ACTION_SCOPE');
/**
 * action scope.
 *
 * @export
 * @abstract
 * @class ActionScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export abstract class ActionScope<T extends IocRaiseContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        let scope = ctx.getContext(CTX_ACTION_SCOPE);
        this.setScope(ctx, this);
        super.execute(ctx, next);
        this.setScope(ctx, scope);
    }

    protected setScope(ctx: T, parentScope?: any) {
        ctx.setContext(CTX_ACTION_SCOPE, parentScope);
    }
}
