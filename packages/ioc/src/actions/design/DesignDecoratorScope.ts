import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DecoratorScopeRegisterer, DecoratorScopes } from '../DecoratorRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> {

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
    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.getDesignRegisterer();
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
