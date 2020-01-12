import { lang } from '@tsdi/ioc';
import { BuilderServiceToken } from '../services/IBuilderService';
import { BootContext } from '../BootContext';


export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.getOptions().bootstrap || ctx.annoation?.bootstrap;
    if (!ctx.bootstrap && (ctx.template || bootModule)) {
        ctx.providers.inject(
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )

        ctx.bootstrap = await ctx.injector.get(BuilderServiceToken).resolve({
            type: ctx.injector.getTokenProvider(bootModule),
            parent: ctx,
            template: ctx.template,
            providers: ctx.providers,
            injector: ctx.injector
        });

    }
    await next();
};
