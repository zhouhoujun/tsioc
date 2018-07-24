import { IModuleLoader, DefaultContainerBuilder, Express, Type } from '@ts-ioc/core';
import { NodeModuleLoader } from './NodeModuleLoader';

/**
 * container builder.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
export class ContainerBuilder extends DefaultContainerBuilder {

    constructor(loader?: IModuleLoader, filter?: Express<Type<any>, boolean>) {
        super(loader || new NodeModuleLoader(), filter)
    }
}
