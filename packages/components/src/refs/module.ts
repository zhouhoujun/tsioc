import { Abstract, IInjector, Type } from '@tsdi/ioc';
import { ModuleRef } from '@tsdi/boot';

/**
 * @publicApi
 */
@Abstract()
export abstract class ModuleFactory<T> {
    abstract get moduleType(): Type<T>;
    abstract create(parentInjector: IInjector | null): ModuleRef<T>;
}
