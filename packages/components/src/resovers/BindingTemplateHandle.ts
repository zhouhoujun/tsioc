import { ResolveHandle, BuildContext, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { ComponentManager } from '../ComponentManager';
import { CompositeNode } from '../CompositeNode';
import { VirtualNode } from '../VirtualNode';


export class BindingTemplateHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.composite) {

            let mgr = this.container.get(ComponentManager);
            if (!(ctx.composite instanceof CompositeNode)) {
                let node = new VirtualNode(ctx.composite, ctx.template ? ctx.template.refSelector : undefined);
                ctx.composite = node;
            }

            mgr.setAnnoation(ctx.target, ctx.annoation);

            let startupRegr = this.container.get(StartupDecoratorRegisterer);

            let validRegs = startupRegr.getRegisterer(StartupScopes.ValidComponent);
            if (validRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, validRegs.getFuncs(this.container, ctx.decorator));
            }

            if (ctx.composite instanceof CompositeNode) {
                ctx.composite.$scope = ctx.target;
                mgr.setComposite(ctx.target, ctx.composite);
                if (ctx.scope) {
                    let parent = ctx.scope instanceof CompositeNode ? ctx.scope : mgr.getComposite(ctx.scope);
                    if (parent && parent instanceof CompositeNode) {
                        parent.add(ctx.composite);
                    }
                }
            }

            let bindRegs = startupRegr.getRegisterer(StartupScopes.Binding);
            if (bindRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, bindRegs.getFuncs(this.container, ctx.decorator));
            }

        }
        if (next) {
            await next();
        }
    }
}
