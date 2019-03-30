import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Pack } from './decorators';
import {
    DecoratorScopeRegisterer, BindProviderAction, IocGetCacheAction,
    IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction, Inject
} from '@tsdi/ioc';

/**
 * pack setup.
 *
 * @export
 * @class PackSetup
 */
@IocExt('setup')
export class PackSetup {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    setup() {
        let reg = this.container.resolve(DecoratorScopeRegisterer);
        reg.register(Pack, BindProviderAction, IocGetCacheAction, IocSetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
    }
}
