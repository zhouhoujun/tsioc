import { IocRaiseContext } from './Action';
import { IocCompositeAction } from './IocCompositeAction';
import { CTX_CURR_SCOPE } from '../context-tokens';


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
        let scope = ctx.get(CTX_CURR_SCOPE);
        this.setScope(ctx, this);
        super.execute(ctx, next);
        this.setScope(ctx, scope);
    }

    protected setScope(ctx: T, parentScope?: any) {
        ctx.set(CTX_CURR_SCOPE, parentScope);
    }
}
