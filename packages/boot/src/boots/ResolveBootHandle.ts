import { lang } from '@tsdi/ioc';
import { BuilderServiceToken } from '../services/IBuilderService';
import { BootContext } from '../BootContext';
import { CTX_MODULE_BOOT_TOKEN, CTX_MODULE_BOOT } from '../context-tokens';


export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.getValue(CTX_MODULE_BOOT_TOKEN) || ctx.annoation?.bootstrap;
    if (!ctx.hasValue(CTX_MODULE_BOOT) && (ctx.template || bootModule)) {
        ctx.providers.inject(
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )

        let boot = await ctx.injector.getInstance(BuilderServiceToken).resolve({
            type: ctx.injector.getTokenProvider(bootModule),
            parent: ctx,
            template: ctx.template,
            providers: ctx.providers,
            injector: ctx.injector
        });

        boot && ctx.setValue(CTX_MODULE_BOOT, boot);

    }
    await next();
};
