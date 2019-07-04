import { BuildHandle, BuildContext } from '@tsdi/boot';
import { Activity } from '../core';
import { ComponentManager } from '@tsdi/components';

export class BindingTaskComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (ctx.composite instanceof Activity) {
            let target = ctx.target;
            ctx.composite.scope = target;
            ctx.composite.isScope = true;
            let scope = target;
            ctx.composite.scopes = this.container.get(ComponentManager).getScopes(scope);
        }

        await next();
    }
}
