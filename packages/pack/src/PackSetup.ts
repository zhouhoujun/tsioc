import { IContainer, CoreActions, Inject, ContainerToken, IocExt } from '@ts-ioc/core';
import { Pack } from './decorators';

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
        let lifeScope = this.container.getLifeScope();
        lifeScope.registerDecorator(Pack, CoreActions.bindProvider, CoreActions.cache, CoreActions.componentBeforeInit, CoreActions.componentInit, CoreActions.componentAfterInit);
    }
}
