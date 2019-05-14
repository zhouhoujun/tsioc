import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { TemplateManager } from '../../core';
import { BindingTemplateDecoratorRegisterer } from './BindingTemplateDecoratorRegisterer';

export class BindingTemplateHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.component) {
            let raiseContainer = ctx.getRaiseContainer();

            raiseContainer.get(TemplateManager)
                .set(ctx.target, ctx.component);

            await this.execFuncs(ctx, this.container.get(BindingTemplateDecoratorRegisterer)
                .getFuncs(this.container, ctx.decorator));

        }
        if (next) {
            await next();
        }
    }
}
