import { Modules } from '@tsdi/ioc';
import { IContainer, IModuleLoader, IContainerBuilder } from './link';
import { LoadType } from './types';
import { CONTAINER_BUILDER, MODULE_LOADER } from './tk';
import { Container } from './container';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class ContainerBuilder implements IContainerBuilder {

    private _loader?: IModuleLoader
    constructor(loader?: IModuleLoader) {
        this._loader = loader;
    }

    create(): IContainer {
        let container = new Container();
        container.setValue(CONTAINER_BUILDER, this);
        if (this._loader) {
            container.setValue(MODULE_LOADER, this._loader);
        }
        return container;
    }

    /**
     * build container.
     *
     * @param {...LoadType[]} [modules]
     * @returns
     */
    async build(...modules: LoadType[]) {
        let container: IContainer = this.create();
        if (modules.length) {
            await container.load(container, ...modules);
        }
        return container;
    }

    syncBuild(...modules: Modules[]): IContainer {
        let container: IContainer = this.create();
        if (modules.length) {
            container.use(...modules);
        }
        return container;
    }

    protected getLoader(container: IContainer): IModuleLoader {
        return container.getInstance(MODULE_LOADER) || this._loader;
    }

}
