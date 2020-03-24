import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DecoratorScope, DecoratorScopes } from '../DecoratorsRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { IActionSetup } from '../Action';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> implements IActionSetup {

    protected getScopeDecorators(ctx: DesignActionContext, scope: DecoratorScope): string[] {
        switch (scope) {
            case DecoratorScopes.BeforeAnnoation:
                return ctx.targetReflect.decorators.design.beforeAnnoDecors
            case DecoratorScopes.Annoation:
            case DecoratorScopes.AfterAnnoation:
            case DecoratorScopes.Class:
                return ctx.targetReflect.decorators.design.classDecors;
            case DecoratorScopes.Method:
                return ctx.targetReflect.decorators.design.methodDecors;
            case DecoratorScopes.Property:
                return ctx.targetReflect.decorators.design.propsDecors;
        }
        return ctx.targetReflect.decorators.design.getDecortors(scope);
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
