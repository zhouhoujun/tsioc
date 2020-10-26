import { IocExt, Inject, IOC_CONTAINER } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ConnectionsHandle } from './handle';
import { ConfigureServiceHandle, StatupServiceScope } from '../boot/handles';
import { ExtendBaseTypeMap } from './ModelParser';


/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(IOC_CONTAINER) container: IContainer) {
        container.registerType(ExtendBaseTypeMap);
        const actInjector = container.getActionInjector();
        actInjector.getInstance(StatupServiceScope)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
