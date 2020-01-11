import { BootContext } from '../BootContext';
import { BuilderServiceToken } from '../services/IBuilderService';


export const ResolveTypeHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (ctx.type && !ctx.target) {
        ctx.target = await ctx.injector.get(BuilderServiceToken).resolve({
            type: ctx.type,
            parent: ctx.getParent(),
            template: ctx.template,
            providers: ctx.providers,
            injector: ctx.injector
        });
    }
    await next();
};
