import { IocCompositeAction, Singleton, Autorun } from '@tsdi/ioc';
import { ResovleActionContext } from './ResovleActionContext';
import { IocDefaultResolveAction } from './IocDefaultResolveAction';


@Singleton
@Autorun('setup')
export class ResolveScopeAction extends IocCompositeAction<ResovleActionContext> {

    setup() {
        this.container.register(IocDefaultResolveAction);
        this.use(IocDefaultResolveAction);
    }
}
