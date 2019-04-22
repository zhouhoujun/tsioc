import { IocCompositeAction } from '@tsdi/ioc';
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
export class ResolveServiceScope extends IocCompositeAction<ResolveServiceContext<any>> {

    execute(ctx: ResolveServiceContext<any>, next?: () => void): void {
        if (!ctx.instance) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.registerAction(ResolveTargetServiceAction, true)
            .registerAction(ResolveServiceTokenAction);

        this.use(ResolveTargetServiceAction)
            .use(ResolveServiceTokenAction);
    }
}
