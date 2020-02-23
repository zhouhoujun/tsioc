import { IocResolveScope, IActionSetup, PROVIDERS } from '@tsdi/ioc';
import { ResovleServicesInClassAction } from './ResovleServicesInClassAction';
import { ResovleServicesAction } from './ResovleServicesAction';
import { ResolveServicesContext } from './ResolveServicesContext';




export class ResolveServicesScope extends IocResolveScope implements IActionSetup {

    execute(ctx: ResolveServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }
        ctx.services = ctx.injector.get(PROVIDERS);
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            // after all resolve default.
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                let key = ctx.injector.getTokenKey(defaultTk);
                if (ctx.injector.hasRegister(key)) {
                    ctx.services.set(key, ctx.injector.getTokenFactory(key));
                }
            }
        }
        // after all clean.
        ctx.destroy();
    }
    setup() {
        this.use(ResovleServicesInClassAction)
            .use(ResovleServicesAction);
    }
}
