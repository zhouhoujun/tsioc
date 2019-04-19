import { IocCompositeAction, lang, Singleton, isToken, isClass, Autorun, isClassType } from '@tsdi/ioc';
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
            let targetType = isToken(currTgRef) ? currTgRef : currTgRef.getToken();
            let classType = isClass(targetType) ? targetType : this.container.getTokenProvider(targetType);
            if (isClassType(classType)) {
                ctx.currTargetType = classType;
                lang.forInClassChain(classType, ty => {
                    if (ty === targetType) {
                        return true;
                    }
                    if (currTgRef instanceof TargetService) {
                        ctx.currTargetRef = currTgRef.clone(ty);
                    } else {
                        ctx.currTargetRef = ty;
                    }
                    super.execute(ctx);
                    if (ctx.instance) {
                        return false;
                    }
                    return true;
                });
            }
            if (!ctx.instance) {
                ctx.currTargetRef = currTgRef;
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
