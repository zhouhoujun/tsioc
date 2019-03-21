import { IocCompositeAction, Singleton, Autorun } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { ResolveTargetServiceAction } from './ResolveTargetServiceAction';
import { ResolveServiceInClassChain } from './ResolveServiceInClassChain';
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
export class ResolveServiceScopeAction extends IocCompositeAction<ResolveServiceContext> {

    setup() {
        this.use(ResolveTargetServiceAction)
            .use(ResolveServiceInClassChain)
            .use(ResolveServiceTokenAction);
    }
}
