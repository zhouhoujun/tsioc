import { DecoratorScope, DecoratorScopes } from '../DecoratorsRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { RuntimeActionContext } from './RuntimeActionContext';


export abstract class RuntimeDecoratorScope extends IocDecoratorScope<RuntimeActionContext> {

    protected getScopeDecorators(ctx: RuntimeActionContext, scope: DecoratorScope): string[] {
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
        return ctx.targetReflect.decorators.runtime.getDecortors(scope);
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }

}
