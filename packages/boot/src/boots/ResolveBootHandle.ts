import { isClass, lang } from '@tsdi/ioc';
import { BuilderServiceToken } from '../services/IBuilderService';
import { BootContext } from '../BootContext';


export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.getOptions().bootstrap || ctx.annoation.bootstrap;
    if (bootModule && !ctx.bootstrap) {
        ctx.providers.inject(
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        if (isClass(bootModule)) {
            ctx.bootstrap = await ctx.injector.get(BuilderServiceToken).resolve({
                type: bootModule,
                parent: ctx,
                template: ctx.template,
                providers: ctx.providers,
                injector: ctx.injector
            });
        } else if (bootModule) {
            ctx.bootstrap = ctx.injector.get(bootModule, ctx.providers);
        }
    }
    await next();
};
