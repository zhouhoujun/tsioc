import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DecoratorsRegisterer, DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';
import { IActionSetup } from '../Action';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> implements IActionSetup {

    protected getState(ctx: DesignActionContext, dtype: DecoratorScopes): ObjectMap<boolean> {
        switch (dtype) {
            case DecoratorScopes.Class:
                return ctx.targetReflect.decorators.design.classDecorState;
            case DecoratorScopes.Method:
                return ctx.targetReflect.decorators.design.methodDecorState;
            case DecoratorScopes.Property:
                return ctx.targetReflect.decorators.design.propsDecorState;
        }
        return null;
    }
    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.actInjector.getInstance(DesignRegisterer);
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
