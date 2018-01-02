import { BrowserModuleLoader } from './BrowserModuleLoader';
import { IModuleLoader } from '../IModuleLoader';
import { ContainerBaseBuilder } from '../ContainerBaseBuilder';

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
