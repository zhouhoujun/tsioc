import { IModuleLoader, DefaultContainerBuilder } from '@tsioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';


export class ContainerBuilder extends DefaultContainerBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
