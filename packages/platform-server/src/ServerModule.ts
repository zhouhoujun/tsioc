import { IocExt, Inject, ContainerToken, IContainer, ModuleLoaderToken, ContainerBuilderToken, InjectToken } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';
import { ServerContainerBuilder } from './ContainerBuilder';
import * as path from 'path';

const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));
export const ProcessRootToken = new InjectToken<string>('processRoot');
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
        container.bindProvider(ProcessRootToken, () => processRoot);
        container.bindProvider(ModuleLoaderToken, new NodeModuleLoader());
        container.bindProvider(ContainerBuilderToken, new ServerContainerBuilder());
    }
}
