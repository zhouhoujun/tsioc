import { IocResolveScope, IActionSetup, PROVIDERS } from '@tsdi/ioc';
import { ResovleServicesInClassAction } from './ResovleServicesInClassAction';
import { ResovleServicesAction } from './ResovleServicesAction';
import { ResolveServicesContext } from './ResolveServicesContext';




export class ResolveServicesScope extends IocResolveScope implements IActionSetup {

    execute(ctx: ResolveServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }
        ctx.services = ctx.get(PROVIDERS);
        super.execute(ctx);
        if (ctx.providers.size < 1) {
            next && next();
            if (ctx.providers.size < 1) {
                // after all resolve default.
                let defaultTk = ctx.getOptions().default;
                if (defaultTk) {
                    ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
                }
            }
        }

    }
    setup() {
        this.use(ResovleServicesInClassAction)
            .use(ResovleServicesAction);
    }
}
