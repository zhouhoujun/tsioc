import { IIocContainer, IocCompositeAction } from '@ts-ioc/ioc';
import { ResovleActionContext } from './ResovleActionContext';
import { IocDefaultResolveAction } from './IocDefaultResolveAction';


export class ResolveScopeAction extends IocCompositeAction<ResovleActionContext> {

    registerDefault(container: IIocContainer) {
        container.registerSingleton(IocDefaultResolveAction, () => new IocDefaultResolveAction());
        this.use(IocDefaultResolveAction);
    }
}
