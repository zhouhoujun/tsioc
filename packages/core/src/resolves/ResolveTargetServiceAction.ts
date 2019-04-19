import { Singleton, IocCompositeAction, Autorun, isToken, isClass, isClassType } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveRefServiceAction } from './ResolveRefServiceAction';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';

@Singleton
@Autorun('setup')
export class ResolveTargetServiceAction extends IocCompositeAction<ResolveServiceContext<any>> {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (ctx.targetRefs) {
            let currTk = ctx.currToken;
            let has = ctx.targetRefs.some(t => {
                ctx.currTargetRef = t;
                ctx.currTargetToken = isToken(t) ? t : t.getToken();
                ctx.currTargetType = isClassType(ctx.currTargetToken) ? ctx.currTargetToken : this.container.getTokenProvider(ctx.currTargetToken);
                return ctx.tokens.some(tk => {
                    ctx.currToken = tk;
                    super.execute(ctx);
                    return !!ctx.instance;
                })
            });
            if (!has) {
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
            .use(ResolveDecoratorServiceAction);
    }
}
