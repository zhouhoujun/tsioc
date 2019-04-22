import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveTargetServiceAction } from './ResolveTargetServiceAction';
import { ResolveServiceTokenAction } from './ResolveServiceTokenAction';


/**
 * service resolve component.
 *
 * @export
 * @class ResolveServiceAction
 * @extends {IocCompositeAction<ResolveServiceContext>}
 */
@Singleton
@Autorun('setup')
export class ResolveServiceScope extends IocCompositeAction<ResolveServiceContext<any>> {

    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ResolveTargetServiceAction)
            .use(ResolveServiceTokenAction);
    }
}
