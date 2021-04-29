import { Container, IContainer, IModuleLoader, LoadType, Modules, MODULE_LOADER } from '@tsdi/ioc';
import { IContainerBuilder } from './IBuilder';
import { CONTAINER_BUILDER } from './tk';
import { CoreModule } from './CoreModule';

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
        container.register(CoreModule);
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
            await container.load(modules);
        }
        return container;
    }

    syncBuild(...modules: Modules[]): IContainer {
        let container: IContainer = this.create();
        if (modules.length) {
            container.use(modules);
        }
        return container;
    }

    protected getLoader(container: IContainer): IModuleLoader {
        return container.getInstance(MODULE_LOADER) || this._loader;
    }

}
