import { DecoratorsRegisterer, DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { RuntimeActionContext } from './RuntimeActionContext';


export abstract class RuntimeDecoratorScope extends IocDecoratorScope<RuntimeActionContext> {

    protected hasDecors(ctx: RuntimeActionContext, scope: DecoratorScopes): string[] {
        switch (scope) {
            case DecoratorScopes.Class:
                return ctx.targetReflect.decorators.runtime.classDecors;
            case DecoratorScopes.Method:
                return ctx.targetReflect.decorators.runtime.methodDecors;
            case DecoratorScopes.Property:
                return ctx.targetReflect.decorators.runtime.propsDecors;
            case DecoratorScopes.Parameter:
                return ctx.targetReflect.decorators.runtime.getParamDecors(ctx.propertyKey, ctx.target);
            case DecoratorScopes.BeforeConstructor:
                return ctx.targetReflect.decorators.runtime.beforeCstrDecors;
            case DecoratorScopes.AfterConstructor:
                return ctx.targetReflect.decorators.runtime.afterCstrDecors
        }
        return [];
    }

    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.actInjector.get(RuntimeRegisterer);
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }

}
