import { DesignDecoratorScope } from './DesignDecoratorScope';
import { DesignActionContext } from './DesignActionContext';
import { IocRegisterScope } from '../IocRegisterScope';
import { DecoratorScope, DesignRegisterer, DecoratorScopes } from '../DecoratorsRegisterer';
import { BindPropertyTypeAction } from './BindPropertyTypeAction';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';
import { IActionSetup } from '../Action';


export class DesignPropertyScope extends IocRegisterScope<DesignActionContext> implements IActionSetup {

    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(Inject, DecoratorScopes.Property, BindPropertyTypeAction)
            .register(AutoWired, DecoratorScopes.Property, BindPropertyTypeAction);

        this.use(DesignPropertyDecoratorScope);
    }
}


export class DesignPropertyDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScope {
        return DecoratorScopes.Property;
    }
}
