import { Handle, BuildContext, ComponentManager } from '@tsdi/boot';
import { Activity } from '../core';

export class BindingTaskComponentHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (ctx.component instanceof Activity) {
            let target = ctx.target;
            ctx.component.scope = target;
            ctx.component.isScope = true;
            let scope = target;
            let mgr = this.container.get(ComponentManager);
            let scopes = [];
            while (scope) {
                scopes.push(scope);
                scope = mgr.getParent(scope);
            }
            ctx.component.scopes = scopes;
        }

        await next();
    }
}
