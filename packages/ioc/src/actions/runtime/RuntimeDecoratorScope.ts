
import { DecoratorRegisterer, RuntimeDecoratorRegisterer, MetadataService } from '../../services';
import { DecoratorType } from '../../factories';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';
import { RuntimeActionContext } from './RuntimeActionContext';

export abstract class RuntimeDecoratorScope extends IocDecoratorScope {

    protected getState(ctx: RuntimeActionContext, dtype: DecoratorType): ObjectMap<boolean> {
        switch (dtype) {
            case DecoratorType.Class:
                return this.getClassDecorState(ctx);
            case DecoratorType.Method:
                return this.getMethodDecorState(ctx);
            case DecoratorType.Property:
                return this.getPropDecorState(ctx);
            case DecoratorType.Parameter:
                return this.getParamDecorState(ctx);
            case DecoratorType.BeforeConstructor:
                return this.getBeforeCstrDecorsState(ctx);
            case DecoratorType.AfterConstructor:
                return this.getAfterCstrDecorsState(ctx);
        }
        return null;
    }

    protected getClassDecorState(ctx: RuntimeActionContext) {
        if (!ctx.classDecors) {
            ctx.classDecors = this.container.get(MetadataService)
                .getClassDecorators(ctx.targetType)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.classDecors;
    }

    protected getMethodDecorState(ctx: RuntimeActionContext) {
        if (!ctx.methodDecors) {
            ctx.methodDecors = this.container.get(MetadataService)
                .getMethodDecorators(ctx.targetType)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.methodDecors;
    }

    protected getPropDecorState(ctx: RuntimeActionContext) {
        if (!ctx.propsDecors) {
            ctx.propsDecors = this.container.get(MetadataService)
                .getPropertyDecorators(ctx.targetType)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.propsDecors;
    }

    protected getParamDecorState(ctx: RuntimeActionContext) {
        if (!ctx.paramDecors) {
            ctx.paramDecors = this.container.get(MetadataService)
                .getParameterDecorators(ctx.target || ctx.targetType, ctx.propertyKey)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.paramDecors;
    }

    protected getBeforeCstrDecorsState(ctx: RuntimeActionContext) {
        if (!ctx.beforeCstrDecors) {
            ctx.beforeCstrDecors = Array.from(this.getRegisterer().getDecoratorMap(DecoratorType.BeforeConstructor).keys())
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.beforeCstrDecors;
    }

    protected getAfterCstrDecorsState(ctx: RuntimeActionContext) {
        if (!ctx.afterCstrDecors) {
            ctx.afterCstrDecors = Array.from(this.getRegisterer().getDecoratorMap(DecoratorType.AfterConstructor).keys())
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.afterCstrDecors;
    }

    protected getRegisterer(): DecoratorRegisterer {
        return this.container.resolve(RuntimeDecoratorRegisterer);
    }

    setup() {
        this.use(RuntimeDecoratorAction);
    }

}
