import { IModuleLoader, DefaultContainerBuilder } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * container builder.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
export class ContainerBuilder extends DefaultContainerBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
