import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScopes } from '../DecoratorsRegisterer';
import { IActionSetup } from '../Action';


/**
 * ioc register actions scope run before constructor.
 *
 * @export
 * @class IocBeforeConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocBeforeConstructorScope extends IocRegisterScope<RuntimeActionContext> implements IActionSetup {
    setup() {
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
