import { IModuleLoader, ContainerBaseBuilder } from '@tsioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';


/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {ContainerBaseBuilder}
 */
export class ContainerBuilder extends ContainerBaseBuilder {
    constructor(loader?: IModuleLoader) {
        super(loader || new BrowserModuleLoader())
    }
}
