import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { ComponentManager } from '../../core';
import { BindingComponentRegisterer } from './BindingComponentRegisterer';
import { ValidComponentRegisterer } from './ValidComponentRegisterer';

export class BindingTemplateHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.component) {

            let mgr = this.container.get(ComponentManager);
            mgr.setAnnoation(ctx.target, ctx.annoation);
            if (ctx.scope) {
                mgr.setContent(ctx.scope, ctx.target);
            }

            let validRegs = this.container.get(ValidComponentRegisterer);
            if (validRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, validRegs.getFuncs(this.container, ctx.decorator));
            }

            if (ctx.component) {
                mgr.setContent(ctx.target, ctx.component);
            }

            let bindRegs = this.container.get(BindingComponentRegisterer);
            if (bindRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, bindRegs.getFuncs(this.container, ctx.decorator));
            }

        }
        if (next) {
            await next();
        }
    }
}
