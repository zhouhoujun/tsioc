import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { IActionSetup } from '../Action';
import { DecoratorScope } from '../../types';
import { befCstr } from '../../utils/exps';


/**
 * ioc register actions scope run before constructor.
 *
 */
export class BeforeCtorScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(BeforeCtorDecorScope);
    }
}

/**
 * before constructor decorator.
 *
 */
export class BeforeCtorDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return befCstr;
    }
}
