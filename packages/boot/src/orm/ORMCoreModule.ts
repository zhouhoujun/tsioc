import { IocExt, Inject, IOC_CONTAINER } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ConnectionsHandle } from './handle';
import { ConfigureServiceHandle, StartupGlobalService } from '../boot/handles';
import { ExtendBaseTypeMap } from './ModelParser';


/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(IOC_CONTAINER) container: IContainer) {
        container.registerType(ExtendBaseTypeMap);
        const actInjector = container.actionPdr;
        actInjector.getInstance(StartupGlobalService)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
