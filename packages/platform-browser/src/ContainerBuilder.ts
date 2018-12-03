import { IModuleLoader, ContainerBuilder, IContainer } from '@ts-ioc/core';
import { BrowserModuleLoader } from './BrowserModuleLoader';
import { BrowserModule } from './BrowserModule';

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

    create(): IContainer {
        let container = super.create();
        container.use(BrowserModule);
        return container;
    }
}
