import { IModuleLoader, ContainerBuilder, IContainer } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';
import { ServerModule } from './ServerModule';

/**
 * container builder.
 *
 * @export
 * @class ContainerBuilder
 * @extends {ContainerBuilder}
 */
export class ServerContainerBuilder extends ContainerBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader());
    }

    create(): IContainer {
        let container = super.create();
        container.use(ServerModule);
        return container;
    }
}
