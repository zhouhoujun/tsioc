import { DesignDecoratorScope } from './DesignDecoratorScope';
import { DesignActionContext } from './DesignActionContext';
import { IocRegisterScope } from '../IocRegisterScope';
import { DesignDecoratorRegisterer, DecoratorScopes } from '../../services';
import { BindPropertyTypeAction } from './BindPropertyTypeAction';
import { Inject, AutoWired } from '../../decorators';

export class DesignPropertyScope extends IocRegisterScope<DesignActionContext> {

    setup() {
        this.registerAction(BindPropertyTypeAction);

        let decRgr = this.container.get(DesignDecoratorRegisterer);
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
