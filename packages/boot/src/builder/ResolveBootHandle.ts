import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { isClass } from '@tsdi/ioc';
import { BuilderServiceToken } from './IBuilderService';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let bootModule = ctx.annoation.bootstrap;
            if (isClass(bootModule)) {
                ctx.bootstrap = await this.container.get(BuilderServiceToken).resolve(bootModule, {
                    scope: ctx.scope,
                    providers: ctx.providers
                }, ctx.getRaiseContainer());
            } else if (bootModule) {
                let container = ctx.getRaiseContainer();
                ctx.bootstrap = container.resolve(bootModule, ...ctx.providers);
            }
        }
        await next();
    }
}
