import { LifeScope, Singleton, Autorun } from '@tsdi/ioc';
import { ResovleActionContext, ResolveScopeAction } from '../resolves';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {LifeScope<IResovleContext>}
 */

 @Singleton
 @Autorun('setup')
export class ResolveLifeScope extends LifeScope<ResovleActionContext> {

    setup() {
        this.container.register(ResolveScopeAction);
        this.use(ResolveScopeAction);
    }
}
