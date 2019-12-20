import { IocResolveScope, IActionSetup, isNullOrUndefined } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveTargetServiceAction } from './ResolveTargetServiceAction';
import { ResolveServiceTokenAction } from './ResolveServiceTokenAction';


/**
 * service resolve component.
 *
 * @export
 * @class ResolveServiceAction
 * @extends {IocResolveScope}
 */
export class ResolveServiceScope extends IocResolveScope implements IActionSetup {

    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (isNullOrUndefined(ctx.instance)) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(ResolveTargetServiceAction)
            .use(ResolveServiceTokenAction);
    }
}
