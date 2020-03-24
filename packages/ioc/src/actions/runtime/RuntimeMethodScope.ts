import { RuntimeDecorScope } from './RuntimeDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { RuntimeContext } from './RuntimeActionContext';
import { RuntimeRegisterer } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { MthAutorunAction } from './MethodAutorunAction';
import { DecoratorScope } from '../../types';
import { IActionSetup } from '../Action';
import { mth } from '../../utils/exps';

export class RuntimeMthScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Autorun, mth, MthAutorunAction);

        this.use(RuntimeMthDecorScope);
    }
}

export class RuntimeMthDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return mth;
    }
}
