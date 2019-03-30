import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Asset } from './decorators/Asset';
import {
    Inject, DecoratorScopeRegisterer, BindProviderAction, IocSetCacheAction,
    IocGetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction
} from '@tsdi/ioc';

/**
 * build module setup.
 *
 * @export
 * @class BuildSetup
 */
@IocExt('setup')
export class AssetSetup {
    constructor(@Inject(ContainerToken) private container: IContainer) {

    }
    setup() {
        let decReg = this.container.resolve(DecoratorScopeRegisterer);
        decReg.register(Asset, BindProviderAction, IocSetCacheAction, IocGetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
    }
}
