import { DesignDecoratorAction } from './DesignDecoratorAction';
import { DesignActionContext } from './DesignActionContext';
import { DesignDecoratorRegisterer, DecoratorRegisterer } from '../../services';
import { DecoratorType } from '../../factories';
import { IocDecoratorScope } from '../IocDecoratorScope';
import { ObjectMap } from '../../types';
import { IIocContainer } from '../../IIocContainer';

export abstract class DesignDecoratorScope extends IocDecoratorScope<DesignActionContext> {

    protected getState(ctx: DesignActionContext, dtype: DecoratorType): ObjectMap<boolean> {
        switch (dtype) {
            case DecoratorType.Class:
                return ctx.targetReflect.classDecors;
            case DecoratorType.Method:
                return ctx.targetReflect.methodDecors;
            case DecoratorType.Property:
                return ctx.targetReflect.propsDecors;
        }
        return null;
    }
    protected getRegisterer(): DecoratorRegisterer {
        return this.container.resolve(DesignDecoratorRegisterer);
    }

    setup(container: IIocContainer) {
        this.use(DesignDecoratorAction);
    }

}
