import { Singleton, IocCompositeAction, Autorun, IocActionType } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveRefServiceAction } from './ResolveRefServiceAction';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';

@Singleton
@Autorun('setup')
export class ResolveTargetServiceAction extends IocCompositeAction<ResolveServiceContext> {
    execute(ctx: ResolveServiceContext, next?: () => void, filter?: (action: IocActionType) => boolean): void {
        if (ctx.targetRefs) {
            let currTk = ctx.currToken;
            if (!ctx.targetRefs.some(t => ctx.tokens.some(tk => {
                ctx.currTargetRef = t;
                ctx.currToken = tk;
                super.execute(ctx, null, filter);
                return !!ctx.instance;
            }))) {
                ctx.currToken = currTk;
                next && next();
            }

        } else {
            next && next();
        }
    }

    setup() {
        this.use(ResolveRefServiceAction)
            .use(ResolvePrivateServiceAction)
            .use(ResolveServiceInClassChain);
    }
}
