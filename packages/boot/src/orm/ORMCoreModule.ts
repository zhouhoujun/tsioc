import { IocExt, Inject, CONTAINER, IContainer } from '@tsdi/ioc';
import { ConnectionsHandle } from './handle';
import { ConfigureServiceHandle, StartupGlobalService } from '../appl/handles';



/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(CONTAINER) container: IContainer) {
        container.action()
            .getInstance(StartupGlobalService)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
