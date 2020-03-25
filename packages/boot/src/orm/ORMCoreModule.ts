import { IocExt, Inject, IocContainerToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootLifeScope } from '../boots/BootLifeScope';
import { ConnectionsHandle } from './ConnectionsHandle';
import { ConfigureServiceHandle } from '../boots/boot-handles';
import { ExtendBaseTypeMap } from './ModelParser';


/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(IocContainerToken) container: IContainer) {
        container.registerType(ExtendBaseTypeMap);
        const actInjector = container.getActionInjector();
        actInjector.getInstance(BootLifeScope)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
