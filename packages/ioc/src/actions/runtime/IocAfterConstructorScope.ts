import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { IActionSetup } from '../Action';
import { DecoratorScope } from '../../types';
import { aftCstr } from '../../utils/exps';

/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class AfterCtorScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(AfterCtorDecorScope);
    }
}

/**
 * after constructor decorator.
 *
 * @export
 * @extends {RuntimeDecorScope}
 */
export class AfterCtorDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return aftCstr;
    }
}
