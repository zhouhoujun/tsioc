import { IContainer, ContainerToken, IocExt } from '@ts-ioc/core';
import { Asset } from './decorators/Asset';
import {
    Inject, DecoratorRegisterer, BindProviderAction, IocSetCacheAction,
    IocGetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction
} from '@ts-ioc/ioc';

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
        let decReg = this.container.resolve(DecoratorRegisterer);
        decReg.register(Asset, BindProviderAction, IocSetCacheAction, IocGetCacheAction,
            ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);
    }
}
