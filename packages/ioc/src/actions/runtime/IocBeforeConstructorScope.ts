import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes } from '../../services';


/**
 * ioc register actions scope run before constructor.
 *
 * @export
 * @class IocBeforeConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocBeforeConstructorScope extends IocRegisterScope<RuntimeActionContext> {
    setup() {
        this.registerAction(IocBeforeConstructorDecorScope, true);
        this.use(IocBeforeConstructorDecorScope);
    }
}

/**
 * before constructor decorator.
 *
 * @export
 * @class IocBeforeConstructorDecorScope
 * @extends {RuntimeDecoratorScope}
 */
export class IocBeforeConstructorDecorScope extends RuntimeDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.BeforeConstructor;
    }
}
