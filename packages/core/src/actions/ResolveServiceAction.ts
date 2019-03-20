import { IocCompositeAction, Singleton, Autorun } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { InitServiceResolveAction } from './InitServiceResolveAction';
import { ResolveTargetServiceAction } from './ResolveTargetServiceAction';
import { DefaultResolveServiceAction } from './IocResolveServiceAction';
import { ResolveDefaultServiceAction } from './ResolveDefaultServiceAction';


/**
 * service resolve component.
 *
 * @export
 * @class ResolveServiceAction
 * @extends {IocCompositeAction<ResolveServiceContext>}
 */
@Singleton
@Autorun('setup')
export class ResolveServiceAction extends IocCompositeAction<ResolveServiceContext> {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx instanceof ResolveServiceContext) {
            super.execute(ctx, next);
        } else {
            next();
        }
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResolveTargetServiceAction)
            .use(DefaultResolveServiceAction)
            .use(ResolveDefaultServiceAction);
    }
}
