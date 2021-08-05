import { Container, ModuleLoader, LoadType, Modules } from '@tsdi/ioc';
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

    private _loader?: ModuleLoader
    constructor(loader?: ModuleLoader) {
        this._loader = loader;
    }

    create(): Container {
        let container = Container.create();
        container.setValue(CONTAINER_BUILDER, this);
        if (this._loader) {
            container.setValue(ModuleLoader, this._loader);
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
        let container: Container = this.create();
        if (modules.length) {
            await container.load(modules);
        }
        return container;
    }

    syncBuild(...modules: Modules[]): Container {
        let container: Container = this.create();
        if (modules.length) {
            container.use(modules);
        }
        return container;
    }

    protected getLoader(container: Container): ModuleLoader {
        return container.get(ModuleLoader) || this._loader;
    }

}
