import { IModuleLoader, DefaultContainerBuilder } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';


export class ContainerBuilder extends DefaultContainerBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
