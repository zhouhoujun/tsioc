import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { DecoratorScope, DecoratorScopes } from '../DecoratorsRegisterer';
import { IActionSetup } from '../Action';

/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocAfterConstructorScope extends IocRegisterScope<RuntimeActionContext> implements IActionSetup {
    setup() {
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
    protected getDecorScope(): DecoratorScope {
        return DecoratorScopes.AfterConstructor;
    }
}
