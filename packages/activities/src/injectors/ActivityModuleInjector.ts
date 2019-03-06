import { IContainer } from '@ts-ioc/core';
import { Task } from '../decorators/Task';
import { DIModuleInjector, ModuleResovler, InjectedModuleToken } from '@ts-ioc/bootstrap';
import { Singleton, Type } from '@ts-ioc/ioc';


/**
 * activity module injector.
 *
 * @export
 * @class ActivityModuleInjector
 * @extends {DIModuleInjector}
 */
@Singleton
export class ActivityModuleInjector  extends DIModuleInjector {

    getDecorator(): string {
        return Task.toString();
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<ModuleResovler<any>> {
        container.register(type);
        let accor = this.getMetaAccessor(container, this.getDecorator());
        let metaConfig = accor.getMetadata(type, container);
        await this.registerConfgureDepds(container, metaConfig);

        let injMd = new ModuleResovler(type, metaConfig, container);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        return injMd;
    }
}
