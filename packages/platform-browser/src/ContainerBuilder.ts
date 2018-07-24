import { IModuleLoader, DefaultContainerBuilder, Express, Type } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
export class ContainerBuilder extends DefaultContainerBuilder {
    constructor(loader?: IModuleLoader, filter?: Express<Type<any>, boolean>) {
        super(loader || new BrowserModuleLoader(), filter)
    }
}
