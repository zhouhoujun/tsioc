import { isClass, lang } from '@tsdi/ioc';
import { BuilderServiceToken } from './IBuilderService';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let bootModule = ctx.annoation.bootstrap;
            ctx.providers.inject(
                { provide: BootContext, useValue: ctx },
                { provide: lang.getClass(ctx), useValue: ctx }
            )
            if (isClass(bootModule)) {
                let options = ctx.getOptions();
                ctx.bootstrap = await ctx.injector.get(BuilderServiceToken).resolve(bootModule, {
                    scope: options.scope,
                    template: options.template,
                    providers: ctx.providers,
                    injector: ctx.injector
                });
            } else if (bootModule) {
                ctx.bootstrap = ctx.injector.get(bootModule, ctx.providers);
            }
        }
        await next();
    }
}
