import { IocActionContext } from './Action';
import { IocCompositeAction } from './IocCompositeAction';

export abstract class ActionScope<T extends IocActionContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        let scope = ctx.scope;
        this.setScope(ctx);
        super.execute(ctx, next);
        this.setScope(ctx, scope);
    }

    protected setScope(ctx: T, parentScope?: any) {
        ctx.scope = parentScope || this;
    }
}
