import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes } from '../../services';

/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocAfterConstructorScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.use(IocAfterConstructorDecorScope, true);
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
