import { IModuleLoader, ContainerBaseBuilder } from '@tsioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';


export class ContainerBuilder extends ContainerBaseBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
