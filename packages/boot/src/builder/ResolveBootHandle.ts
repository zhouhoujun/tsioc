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
                ctx.bootstrap = await this.container.get(BuilderServiceToken).resolve(bootModule, {
                    scope: options.scope,
                    template: options.template,
                    providers: ctx.providers,
                    raiseContainer: ctx.getFactory()
                });
            } else if (bootModule) {
                let container = ctx.getContainer();
                ctx.bootstrap = container.get(bootModule, ctx.providers);
            }
        }
        await next();
    }
}
