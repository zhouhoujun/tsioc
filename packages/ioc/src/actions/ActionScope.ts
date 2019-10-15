import { IocActionContext } from './Action';
import { IocCompositeAction } from './IocCompositeAction';

/**
 * action scope.
 *
 * @export
 * @abstract
 * @class ActionScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export abstract class ActionScope<T extends IocActionContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        let scope = ctx.actionScope;
        this.setScope(ctx, this);
        super.execute(ctx, next);
        this.setScope(ctx, scope);
    }

    protected setScope(ctx: T, parentScope?: any) {
        ctx.actionScope = parentScope;
    }
}
