import { IContainer } from '@tsdi/core';
import { Task } from '../decorators/Task';
import { DIModuleInjector, ModuleResovler, IDIModuleReflect } from '@tsdi/boot';
import { Singleton, Type } from '@tsdi/ioc';


/**
 * activity module injector.
 *
 * @export
 * @class ActivityModuleInjector
 * @extends {DIModuleInjector}
 */
@Singleton
export class ActivityModuleInjector extends DIModuleInjector {

    getDecorator(): string {
        return Task.toString();
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<ModuleResovler<any>> {
        container.register(type);
        let accor = this.getMetaAccessor(container, this.getDecorator());
        let metaConfig = accor.getMetadata(type, container);
        await this.registerConfgureDepds(container, metaConfig);

        let resolver = new ModuleResovler(type, metaConfig, container);
        let ref = container.getTypeReflects().get<IDIModuleReflect>(type, true);
        ref.moduleResolver = resolver;
        return resolver;
    }
}
