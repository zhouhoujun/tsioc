import { BuildHandle, BuildContext } from '@tsdi/boot';
import { Activity } from '../core';
import { ComponentManager } from '@tsdi/components';

export class BindingTaskComponentHandle extends BuildHandle<BuildContext> {
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
