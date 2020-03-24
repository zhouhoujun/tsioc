import { DesignDecorScope } from './DesignDecoratorScope';
import { DesignContext } from './DesignActionContext';
import { IocRegScope } from '../IocRegisterScope';
import { DesignRegisterer } from '../DecoratorsRegisterer';
import { BindPropTypeAction } from './BindPropertyTypeAction';
import { DecoratorScope } from '../../types';
import { Inject } from '../../decorators/Inject';
import { AutoWired } from '../../decorators/AutoWried';
import { IActionSetup } from '../Action';
import { ptr } from '../../utils/exps';



export class DesignPropScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(Inject, ptr, BindPropTypeAction)
            .register(AutoWired, ptr, BindPropTypeAction);

        this.use(DesignPropDecorScope);
    }
}


export class DesignPropDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return ptr;
    }
}
