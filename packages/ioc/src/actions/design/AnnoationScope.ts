import { DesignDecoratorScope } from './DesignDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignActionContext } from './DesignActionContext';
import { IocAutorunAction } from './IocAutorunAction';
import { DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { Autorun } from '../../decorators/AutoRun';
import { IActionSetup } from '../Action';

export class AnnoationScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {
        this.actInjector
            .regAction(IocAutorunAction);

        this.actInjector.getInstance(DesignRegisterer)
            .register(Autorun, DecoratorScopes.AfterAnnoation, IocAutorunAction);

        this.use(AnnoationDecoratorScope)
            .use(AfterAnnoationDecoratorScope);
    }
}


export class AnnoationDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Annoation;
    }
}

export class AfterAnnoationDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.AfterAnnoation;
    }
}
