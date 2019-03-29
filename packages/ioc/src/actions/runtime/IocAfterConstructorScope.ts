import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { DecoratorScopes } from '../../services';

/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocAfterConstructorScope extends IocRegisterScope<RuntimeActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(IocAfterConstructorDecorScope, () => new IocAfterConstructorDecorScope(container));
        container.get(IocAfterConstructorDecorScope).setup(container);
        this.use(IocAfterConstructorDecorScope);
    }
}

/**
 * after constructor decorator.
 *
 * @export
 * @class IocAfterConstructorDecorScope
 * @extends {RuntimeDecoratorScope}
 */
export class IocAfterConstructorDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.AfterConstructor;
    }
}
