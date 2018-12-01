import { IModuleLoader, ContainerBuilder } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * container builder.
 *
 * @export
 * @class ContainerBuilder
 * @extends {ContainerBuilder}
 */
export class ServerContainerBuilder extends ContainerBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
