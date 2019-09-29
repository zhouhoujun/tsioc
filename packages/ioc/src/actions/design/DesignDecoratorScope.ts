import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DesignDecoratorRegisterer, DecoratorScopeRegisterer, DecoratorScopes } from '../DecoratorRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> {

    protected getState(ctx: DesignActionContext, dtype: DecoratorScopes): ObjectMap<boolean> {
        switch (dtype) {
            case DecoratorScopes.Class:
                return ctx.targetReflect.decorators.design.classDecors;
            case DecoratorScopes.Method:
                return ctx.targetReflect.decorators.design.methodDecors;
            case DecoratorScopes.Property:
                return ctx.targetReflect.decorators.design.propsDecors;
        }
        return null;
    }
    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.get(DesignDecoratorRegisterer);
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
