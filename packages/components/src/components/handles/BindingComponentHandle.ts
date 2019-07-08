import { ElementNode } from '../ElementNode';
import { ComponentManager } from '../../ComponentManager';
import { BuildHandle, BuildContext } from '@tsdi/boot';


export class BindingComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (ctx.composite instanceof ElementNode) {
            // let target = ctx.target;
            ctx.composite.$scope = ctx.target;
            // ctx.composite.$scopes = this.container.get(ComponentManager).getScopes(target);
        }

        await next();
    }
}
