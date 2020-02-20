import { lang } from '@tsdi/ioc';
import { BuilderServiceToken } from '../services/IBuilderService';
import { BootContext } from '../BootContext';
import { CTX_MODULE_BOOT_TOKEN, CTX_MODULE_BOOT } from '../context-tokens';


export const ResolveBootHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    let bootModule = ctx.getValue(CTX_MODULE_BOOT_TOKEN) || ctx.getAnnoation()?.bootstrap;
    let template = ctx.getTemplate();
    if (!ctx.hasValue(CTX_MODULE_BOOT) && (template || bootModule)) {
        ctx.providers.inject(
            { provide: BootContext, useValue: ctx },
            { provide: lang.getClass(ctx), useValue: ctx }
        )
        let injector = ctx.injector;
        let boot = await injector.getInstance(BuilderServiceToken).resolve({
            type: injector.getTokenProvider(bootModule),
            parent: ctx,
            template: template,
            providers: ctx.providers,
            injector: injector
        });

        boot && ctx.setValue(CTX_MODULE_BOOT, boot);

    }
    await next();
};
