import { DesignDecoratorScope } from './DesignDecoratorScope';
import { DesignActionContext } from './DesignActionContext';
import { IocRegisterScope } from '../IocRegisterScope';
import { IIocContainer } from '../../IIocContainer';
import { DesignDecoratorRegisterer, DecoratorScopes } from '../../services';
import { BindPropertyTypeAction } from './BindPropertyTypeAction';
import { Inject, AutoWired } from '../../decorators';

export class DesignPropertyScope extends IocRegisterScope<DesignActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(BindPropertyTypeAction, () => new BindPropertyTypeAction(container));
        container.registerSingleton(DesignPropertyDecoratorScope, () => new DesignPropertyDecoratorScope(container));
        container.get(DesignPropertyDecoratorScope).setup(container);

        let decRgr = container.get(DesignDecoratorRegisterer);

        decRgr.register(Inject, DecoratorScopes.Property, BindPropertyTypeAction);
        decRgr.register(AutoWired, DecoratorScopes.Property, BindPropertyTypeAction);

        this.use(DesignPropertyDecoratorScope);
    }
}


export class DesignPropertyDecoratorScope extends DesignDecoratorScope {
    protected getDecorScope(): DecoratorScopes {
        return DecoratorScopes.Property;
    }
}
