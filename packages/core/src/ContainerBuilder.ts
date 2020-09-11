import { Modules } from '@tsdi/ioc';
import { IContainer } from './IContainer';
import { Container } from './Container';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader, ModuleLoader } from './services/loader';
import { LoadType } from './types';
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
        container.setSingleton(ContainerBuilderToken, this);
        if (this._loader) {
            container.setSingleton(ModuleLoader, this._loader);
        }
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
