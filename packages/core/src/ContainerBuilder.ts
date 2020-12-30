import { Container, IContainer, IModuleLoader, LoadType, Modules } from '@tsdi/ioc';
import { CoreModule } from './CoreModule';
import { IContainerBuilder } from './IContainerBuilder';
import { ModuleLoader } from './services/loader';
import { ContainerBuilderToken } from './tk';

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
        container.setValue(ContainerBuilderToken, this);
        if (this._loader) {
            container.setValue(ModuleLoader, this._loader);
        }
        container.registerType(CoreModule);
        return container;
    }

    /**
     * build container.
     *
     * @param {...LoadType[]} [modules]
     * @returns
     * @memberof DefaultContainerBuilder
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
        return container.getInstance(ModuleLoader) || this._loader;
    }

}
