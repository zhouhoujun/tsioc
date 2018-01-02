import { NodeModuleLoader } from './NodeModuleLoader';
import { IModuleLoader } from '../IModuleLoader';
import { ContainerBaseBuilder } from '../ContainerBaseBuilder';

export class ContainerBuilder extends ContainerBaseBuilder {

    constructor(loader?: IModuleLoader) {
        super(loader || new NodeModuleLoader())
    }
}
