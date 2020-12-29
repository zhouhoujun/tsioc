import { IocExt, Inject, CONTAINER, IContainer } from '@tsdi/ioc';
import { ConnectionsHandle } from './handle';
import { ConfigureServiceHandle, StartupGlobalService } from '../boot/handles';
import { ExtendBaseTypeMap } from './ModelParser';


/**
 * ORM Core module.
 */
@IocExt()
export class ORMCoreModule {

    setup(@Inject(CONTAINER) container: IContainer) {
        container.registerType(ExtendBaseTypeMap);
        const actInjector = container.provider;
        actInjector.getInstance(StartupGlobalService)
            .useBefore(ConnectionsHandle, ConfigureServiceHandle);
    }
}
