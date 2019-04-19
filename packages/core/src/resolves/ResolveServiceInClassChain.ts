import { IocCompositeAction, lang, Singleton, Autorun, isClassType, isToken } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { TargetService } from '../TargetService';
import { ResolveRefServiceAction } from './ResolveRefServiceAction';
import { ResolvePrivateServiceAction } from './ResolvePrivateServiceAction';

@Singleton
@Autorun('setup')
export class ResolveServiceInClassChain extends IocCompositeAction<ResolveServiceContext<any>> {
    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (ctx.currTargetRef) {
            let currTgRef = ctx.currTargetRef;
            let classType = ctx.currTargetType;
            let currTagTk = ctx.currTargetToken;
            if (isClassType(classType)) {
                lang.forInClassChain(classType, ty => {
                    if (ty === classType) {
                        return true;
                    }
                    if (currTgRef instanceof TargetService) {
                        ctx.currTargetRef = currTgRef.clone(ty);
                    } else {
                        ctx.currTargetRef = ty;
                    }
                    ctx.currTargetToken = isToken(ctx.currTargetRef) ? ctx.currTargetRef : ctx.currTargetRef.getToken();
                    ctx.currTargetType = isClassType(ctx.currTargetToken) ? ctx.currTargetToken : this.container.getTokenProvider(ctx.currTargetToken);
                    super.execute(ctx);
                    return !ctx.instance;
                });
            }
            if (!ctx.instance) {
                ctx.currTargetRef = currTgRef;
                ctx.currTargetToken = currTagTk;
                ctx.currTargetType = classType;
                next && next();
            }
        } else {
            next && next();
        }
    }

    setup() {
        this.use(ResolveRefServiceAction)
            .use(ResolvePrivateServiceAction);
    }
}
