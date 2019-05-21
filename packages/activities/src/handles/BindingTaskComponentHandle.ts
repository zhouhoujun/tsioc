import { Handle, BuildContext, ComponentManager } from '@tsdi/boot';
import { Activity } from '../core';

export class BindingTaskComponentHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (ctx.component instanceof Activity) {
            let target = ctx.target;
            ctx.component.scope = target;
            ctx.component.isScope = true;
            let scope = target;
            ctx.component.scopes = this.container.get(ComponentManager).getScopes(scope);
        }

        await next();
    }
}
