import { BootContext } from '../BootContext';
import { BuilderServiceToken } from '../services/IBuilderService';


export const ResolveTypeHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type && !ctx.target) {
        let options = ctx.getOptions();
        ctx.target = await ctx.injector.get(BuilderServiceToken).resolve({
            type: ctx.type,
            parent: ctx,
            template: options.template,
            annoation: ctx.annoation,
            decorator: ctx.targetReflect.decorator,
            providers: ctx.providers,
            injector: ctx.injector
        });
    }
    await next();
};
