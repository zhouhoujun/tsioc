import { ModuleLoader, LoadType, Modules, Injector, Container } from '@tsdi/ioc';
import { IContainerBuilder } from './IBuilder';
import { CONTAINER_BUILDER } from './tk';

/**
 * default container builder.
 *
 * @export
 * @class DefaultContainerBuilder
 * @implements {IContainerBuilder}
 */
export class ContainerBuilder implements IContainerBuilder {

    private _loader?: ModuleLoader
    constructor(loader?: ModuleLoader) {
        this._loader = loader;
    }

    create(): Container {
        let container = Injector.create();
        container.setValue(CONTAINER_BUILDER, this);
        if (this._loader) {
            container.setValue(ModuleLoader, this._loader);
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
        let container: Injector = this.create();
        if (modules.length) {
            await container.load(modules);
        }
        return container;
    }

    syncBuild(...modules: Modules[]): Container {
        let container: Injector = this.create();
        if (modules.length) {
            container.use(modules);
        }
        return container;
    }

    protected getLoader(container: Injector): ModuleLoader {
        return container.get(ModuleLoader) || this._loader;
    }

}
