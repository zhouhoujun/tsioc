import { Singleton, IocCompositeAction, Autorun } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveRefServiceAction } from './ResolveRefServiceAction';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveTargetDecoratorServiceAction } from './ResolveTargetDecoratorServiceAction';

@Singleton
@Autorun('setup')
export class ResolveTargetServiceAction extends IocCompositeAction<ResolveServiceContext<any>> {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (ctx.targetRefs) {
            let currTk = ctx.currToken;
            if (!ctx.targetRefs.some(t => ctx.tokens.some(tk => {
                ctx.currTargetRef = t;
                ctx.currToken = tk;
                super.execute(ctx);
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
            .use(ResolveServiceInClassChain)
            .use(ResolveTargetDecoratorServiceAction);
    }
}
