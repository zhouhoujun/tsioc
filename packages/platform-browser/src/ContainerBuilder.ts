import { IModuleLoader, DefaultContainerBuilder } from '@tsioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {DefaultContainerBuilder}
 */
export class ContainerBuilder extends DefaultContainerBuilder {
    constructor(loader?: IModuleLoader) {
        super(loader || new BrowserModuleLoader())
    }
}
