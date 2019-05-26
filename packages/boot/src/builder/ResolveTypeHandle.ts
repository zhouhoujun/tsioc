import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderServiceToken } from './IBuilderService';


export class ResolveTypeHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.module && !ctx.target) {
            ctx.target = await this.container.get(BuilderServiceToken).resolve(ctx.module, {
                scope: ctx.scope,
                template: ctx.template,
                annoation: ctx.annoation,
                decorator: ctx.decorator,
                providers: ctx.providers
            }, ctx.getRaiseContainer());
        }
        if (ctx.target) {
            await next();
        }
    }
}
