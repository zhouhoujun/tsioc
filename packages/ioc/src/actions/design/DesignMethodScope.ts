import { DesignDecorScope } from './DesignDecoratorScope';
import { IocRegScope } from '../IocRegisterScope';
import { DesignContext } from './DesignActionContext';
import { BindMthPdrAction } from './BindMethodProviderAction';
import { DesignRegisterer } from '../DecoratorsRegisterer';
import { AutoWired } from '../../decorators/AutoWried';
import { Providers } from '../../decorators/Providers';
import { IActionSetup } from '../Action';
import { mth } from '../../utils/exps';
import { DecoratorScope } from '../../types';



export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(AutoWired, mth, BindMthPdrAction)
            .register(Providers, mth, BindMthPdrAction);

        this.use(DesignMthDecorScope);
    }
}


export class DesignMthDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return mth;
    }
}
