import { IContainer, ContainerToken, IocExt } from '@ts-ioc/core';
import { Pack } from './decorators';
import {
    DecoratorScopeRegisterer, BindProviderAction, IocGetCacheAction,
    IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction, Inject
} from '@ts-ioc/ioc';

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
