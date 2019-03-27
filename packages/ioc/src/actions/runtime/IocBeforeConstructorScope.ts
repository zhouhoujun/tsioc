import { DecoratorType } from '../../factories';
import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';
import { IocRegisterScope } from '../IocRegisterScope';
import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';


/**
 * ioc register actions scope run before constructor.
 *
 * @export
 * @class IocBeforeConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class IocBeforeConstructorScope extends IocRegisterScope<RuntimeActionContext> {
    setup(container: IIocContainer) {
        container.registerSingleton(IocBeforeConstructorDecorScope, () => new IocBeforeConstructorDecorScope(container));
        container.get(IocBeforeConstructorDecorScope).setup(container);
        this.use(IocBeforeConstructorDecorScope);
    }
}


export class IocBeforeConstructorDecorScope extends RuntimeDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.BeforeConstructor;
    }
}
