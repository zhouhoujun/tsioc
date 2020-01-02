import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DecoratorsRegisterer, DecoratorScopes, DesignRegisterer } from '../DecoratorsRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { IActionSetup } from '../Action';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> implements IActionSetup {

    protected hasDecors(ctx: DesignActionContext, scope: DecoratorScopes): string[] {
        switch (scope) {
            case DecoratorScopes.BeforeAnnoation:
            case DecoratorScopes.Annoation:
            case DecoratorScopes.AfterAnnoation:
            case DecoratorScopes.Class:
                return ctx.targetReflect.decorators.design.classDecors;
            case DecoratorScopes.Method:
                return ctx.targetReflect.decorators.design.methodDecors;
            case DecoratorScopes.Property:
                return ctx.targetReflect.decorators.design.propsDecors;
        }
        return [];
    }
    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.actInjector.getInstance(DesignRegisterer);
    }

    setup() {
        this.use(DesignDecoratorAction);
    }

}
