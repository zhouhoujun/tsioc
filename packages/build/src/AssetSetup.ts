import { IContainer, CoreActions, Inject, ContainerToken, IocExt } from '@ts-ioc/core';
import { Asset } from './decorators/Asset';

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
        let lifeScope = this.container.getLifeScope();
        lifeScope.registerDecorator(Asset, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    }
}
