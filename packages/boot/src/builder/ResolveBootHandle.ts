import { isClass, lang } from '@tsdi/ioc';
import { BuilderServiceToken } from './IBuilderService';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let bootModule = ctx.annoation.bootstrap;
            let extProviders = [
                ...ctx.providers,
                { provide: BootContext, useValue: ctx },
                { provide: lang.getClass(ctx), useValue: ctx }
            ]
            if (isClass(bootModule)) {
                let options = ctx.getOptions();
                ctx.bootstrap = await this.container.get(BuilderServiceToken).resolve(bootModule, {
                    scope: options.scope,
                    template: options.template,
                    providers: extProviders,
                    raiseContainer: ctx.getContainerFactory()
                });
            } else if (bootModule) {
                let container = ctx.getRaiseContainer();
                ctx.bootstrap = container.resolve(bootModule, ...extProviders);
            }
        }
        await next();
    }
}
