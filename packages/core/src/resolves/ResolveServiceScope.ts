import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveTargetServiceAction } from './ResolveTargetServiceAction';
import { ResolveServiceTokenAction } from './ResolveServiceTokenAction';
import { ResolveDecoratorServiceAction } from './ResolveDecoratorServiceAction';


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

    setup() {
        this.use(ResolveTargetServiceAction)
            .use(ResolveServiceTokenAction);
    }
}
