import { InjectorActionContext } from './InjectorActionContext';
import {
    IocDecoratorScope, DecoratorScopeRegisterer, ObjectMap, DecoratorScopes,
    DesignDecoratorRegisterer, Singleton, MetadataService
} from '@ts-ioc/ioc';


@Singleton
export class DecoratorInjectorScope extends IocDecoratorScope<InjectorActionContext> {

    protected getState(ctx: InjectorActionContext, dtype: DecoratorScopes): ObjectMap<boolean> {
        if (!ctx.decorState) {
            ctx.decorState = this.container.get(MetadataService)
                .getClassDecorators(ctx.targetType)
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return ctx.decorState;
    }

    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.get(DesignDecoratorRegisterer);
    }

    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Class;
    }
}
