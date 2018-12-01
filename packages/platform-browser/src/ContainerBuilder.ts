import { IModuleLoader, ContainerBuilder } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import 'core-js';

/**
 * container builder for browser.
 *
 * @export
 * @class ContainerBuilder
 * @extends {ContainerBuilder}
 */
export class BrowserContainerBuilder extends ContainerBuilder {
    constructor(loader?: IModuleLoader) {
        super(loader || new BrowserModuleLoader())
    }
}
