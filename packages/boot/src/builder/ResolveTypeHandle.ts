import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderServiceToken } from './IBuilderService';


export class ResolveTypeHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.module && !ctx.target) {
            let options = ctx.getOptions();
            ctx.target = await ctx.injector.get(BuilderServiceToken).resolve(ctx.module, {
                scope: options.scope,
                template: options.template,
                annoation: ctx.annoation,
                decorator: ctx.targetReflect.decorator,
                providers: ctx.providers,
                injector: ctx.injector
            });
        }
        if (ctx.target) {
            await next();
        }
    }
}
