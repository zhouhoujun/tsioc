
import { DecoratorScopeRegisterer, RuntimeDecoratorRegisterer, DecoratorScopes } from '../DecoratorRegisterer';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { RuntimeActionContext } from './RuntimeActionContext';

export abstract class RuntimeDecoratorScope extends IocDecoratorScope<RuntimeActionContext> {

    protected getState(ctx: RuntimeActionContext, dtype: DecoratorScopes): ObjectMap<boolean> {
        switch (dtype) {
            case DecoratorScopes.Class:
                return this.getClassDecorState(ctx);
            case DecoratorScopes.Method:
                return this.getMethodDecorState(ctx);
            case DecoratorScopes.Property:
                return this.getPropDecorState(ctx);
            case DecoratorScopes.Parameter:
                return this.getParamDecorState(ctx);
            case DecoratorScopes.BeforeConstructor:
                return this.getBeforeCstrDecorsState(ctx);
            case DecoratorScopes.AfterConstructor:
                return this.getAfterCstrDecorsState(ctx);
        }
        return null;
    }

    protected getClassDecorState(ctx: RuntimeActionContext) {
        if (!ctx.classDecors) {
            ctx.classDecors = ctx.targetReflect
                .runtimeDecorators
                .classDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.classDecors;
    }

    protected getMethodDecorState(ctx: RuntimeActionContext) {
        if (!ctx.methodDecors) {
            ctx.methodDecors = ctx.targetReflect
                .runtimeDecorators
                .methodDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.methodDecors;
    }

    protected getPropDecorState(ctx: RuntimeActionContext) {
        if (!ctx.propsDecors) {
            ctx.propsDecors = ctx.targetReflect
                .runtimeDecorators
                .propsDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.propsDecors;
    }

    protected getParamDecorState(ctx: RuntimeActionContext) {
        if (!ctx.paramDecors) {
            ctx.paramDecors = ctx.targetReflect
                .runtimeDecorators
                .getParamDecors(ctx.propertyKey, ctx.target)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.paramDecors;
    }

    protected getBeforeCstrDecorsState(ctx: RuntimeActionContext) {
        if (!ctx.beforeCstrDecors) {
            ctx.beforeCstrDecors = ctx.targetReflect
                .runtimeDecorators
                .beforeCstrDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.beforeCstrDecors;
    }

    protected getAfterCstrDecorsState(ctx: RuntimeActionContext) {
        if (!ctx.afterCstrDecors) {
            ctx.afterCstrDecors = ctx.targetReflect
                .runtimeDecorators
                .afterCstrDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.afterCstrDecors;
    }

    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.get(RuntimeDecoratorRegisterer);
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }

}
