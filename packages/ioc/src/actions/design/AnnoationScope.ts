import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { IocAutorunAction } from './IocAutorunAction';
import { DecoratorScope, DesignRegisterer, DecoratorScopes } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { IocExt } from '../../decorators/IocExt';
import { IActionSetup } from '../Action';

export class AnnoationScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Autorun, DecoratorScopes.AfterAnnoation, IocAutorunAction)
            .register(IocExt, DecoratorScopes.AfterAnnoation, IocAutorunAction);

        this.use(AnnoationDecoratorScope)
            .use(AfterAnnoationDecoratorScope);
    }
}


export class AnnoationDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScope {
        return DecoratorScopes.Annoation;
    }
}

export class AfterAnnoationDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScope {
        return DecoratorScopes.AfterAnnoation;
    }
}
