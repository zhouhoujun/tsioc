import { IocExt, Inject, CONTAINER, IContainer } from '@tsdi/ioc';
import { ConnectionsHandle } from './handle';
import { ConfigureServiceHandle, StartupGlobalService } from '../boot/handles';



/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(CONTAINER) container: IContainer) {
        const actpdr = container.provider;
        actpdr.getInstance(StartupGlobalService)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
