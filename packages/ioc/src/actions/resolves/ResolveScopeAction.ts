import { IocCompositeAction } from '../IocCompositeAction';
import { ResovleActionContext } from './ResovleActionContext';
import { IIocContainer } from '../../IIocContainer';
import { IocDefaultResolveAction } from './IocDefaultResolveAction';


export class ResolveScopeAction extends IocCompositeAction<ResovleActionContext> {

    registerDefault(container: IIocContainer) {
        container.registerSingleton(IocDefaultResolveAction, () => new IocDefaultResolveAction());
        this.use(IocDefaultResolveAction);
    }
}
