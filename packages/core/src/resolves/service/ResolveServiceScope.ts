import { IocResolveScope, IActionSetup } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveTargetScope } from './ResolveTargetScope';

export class ResolveServiceScope extends IocResolveScope<ResolveServiceContext> implements IActionSetup {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.instance || !ctx.tokens || !ctx.tokens.length) {
            return;
        }

        super.execute(ctx);

        next && next();

        if (!ctx.instance) {
            // after all resolve default.
            let defaultTk = ctx.getOptions().default;
            if (defaultTk) {
                ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
            }
        }
        // after all clean.
        ctx.destroy();

    }

    setup() {
        this.use(ResolveTargetScope)
            .use(ResolveServiceTokensAction);
    }
}


export const ResolveServiceTokensAction = function (ctx: ResolveServiceContext, next: () => void): void {
    let injector = ctx.injector;
    ctx.tokens.some(tk => {
        ctx.instance = injector.resolve(tk, ctx.providers);
        return !!ctx.instance;
    });

    if (!ctx.instance && next) {
        next();
    }
}
