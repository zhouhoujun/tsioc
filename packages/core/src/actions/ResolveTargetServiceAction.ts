import { Singleton, IocCompositeAction } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';

@Singleton
export class ResolveTargetServiceAction extends IocCompositeAction<ResolveServiceContext> {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx.targetRefs) {
            let currTk = ctx.currToken;
            if (!ctx.targetRefs.some(t => ctx.tokens.some(tk => {
                ctx.currTargetRef = t;
                ctx.currToken = tk;
                super.execute(ctx, next);
                return !!ctx.instance;
            }))) {
                ctx.currToken = currTk;
                next();
            }

        } else {
            next();
        }
    }
}
