import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { TemplateManager } from '../../core';
import { BindingComponentDecoratorRegisterer } from './BindingComponentDecoratorRegisterer';

export class BindingTemplateHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.component) {
            let raiseContainer = ctx.getRaiseContainer();

            raiseContainer.get(TemplateManager).set(ctx.target, ctx.component);
            let regs = this.container.get(BindingComponentDecoratorRegisterer);
            if (regs.has(ctx.decorator)) {
                await this.execFuncs(ctx, regs.getFuncs(this.container, ctx.decorator));
            }
        }
        if (next) {
            await next();
        }
    }
}
