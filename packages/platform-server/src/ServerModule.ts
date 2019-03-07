import { IocExt, ContainerToken, IContainer, ModuleLoader, ContainerBuilderToken } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';
import { ServerContainerBuilder } from './ContainerBuilder';
import { Inject } from '@ts-ioc/ioc';


declare let process: any;

/**
 * server module for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class ServerModule
 */
@IocExt('setup')
export class ServerModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        container.bindProvider(ModuleLoader, new NodeModuleLoader());
        container.bindProvider(ContainerBuilderToken, new ServerContainerBuilder());
    }
}
