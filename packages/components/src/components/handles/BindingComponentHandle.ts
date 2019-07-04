import { Element } from '../Element';
import { ComponentManager } from '../../ComponentManager';
import { BuildHandle, BuildContext } from '@tsdi/boot';


export class BindingComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (ctx.composite instanceof Element) {
            let target = ctx.target;
            ctx.composite.scope = target;
            let scope = target;
            ctx.composite.scopes = this.container.get(ComponentManager).getScopes(scope);
        }

        await next();
    }
}
