import { LifeScope, IIocContainer } from '@ts-ioc/ioc';
import { ResovleActionContext, ResolveScopeAction } from '../actions';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {LifeScope<IResovleContext>}
 */
export class ResolveLifeScope extends LifeScope<ResovleActionContext> {

    registerDefault(container: IIocContainer) {
        if (!container.has(ResolveLifeScope)) {
            container.bindProvider(ResolveLifeScope, this);
        }
        container.registerSingleton(ResolveScopeAction, () => new ResolveScopeAction());
        container.get(ResolveScopeAction).registerDefault(container);
        this.use(ResolveScopeAction);
    }
}
