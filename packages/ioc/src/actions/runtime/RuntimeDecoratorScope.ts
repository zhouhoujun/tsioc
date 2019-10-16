
import { DecoratorsRegisterer, DecoratorScopes, RuntimeRegisterer } from '../DecoratorsRegisterer';
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
                .decorators.runtime.classDecors
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
                .decorators.runtime.methodDecors
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
                .decorators.runtime.propsDecors
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
                .decorators.runtime.getParamDecors(ctx.propertyKey, ctx.target)
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
                .decorators.runtime.beforeCstrDecors
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
                .decorators.runtime.afterCstrDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.afterCstrDecors;
    }

    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.container.getInstance(RuntimeRegisterer);
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }

}
