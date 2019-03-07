import { LifeScope } from './LifeScope';
import { IIocContainer } from '../IIocContainer';
import { IResovleContext, IocDefaultResolveAction } from '../actions';

export class ResolveLifeScope extends LifeScope<IResovleContext> {

    registerDefault(container: IIocContainer) {
        if(!container.has(ResolveLifeScope)){
            container.bindProvider(ResolveLifeScope, this);
        }
        container.registerSingleton(IocDefaultResolveAction, () => new IocDefaultResolveAction(container));
        this.use(IocDefaultResolveAction);
    }
}