import { isClass, lang } from '@tsdi/ioc';
import { BuilderServiceToken } from './IBuilderService';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let bootModule = ctx.getOptions().bootstrap || ctx.annoation.bootstrap;
        if (bootModule && !ctx.bootstrap) {
            ctx.providers.inject(
                { provide: BootContext, useValue: ctx },
                { provide: lang.getClass(ctx), useValue: ctx }
            )
            if (isClass(bootModule)) {
                let options = ctx.getOptions();
                ctx.bootstrap = await ctx.injector.get(BuilderServiceToken).resolve({
                    type: bootModule,
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
