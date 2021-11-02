import { Injector, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { ProvidedInMetadata } from './metadata/meta';
import { Modules, Type } from './types';
import { ModuleRef } from './module.ref';


/**
 * module option.
 */
export interface ModuleOption extends ProvidedInMetadata {
    /**
     *  providers.
     */
    providers?: ProviderType[];

    /**
     * dependence types.
     */
    deps?: Modules[];

    providedIn?: string | Type;
}

@Abstract()
export abstract class ModuleFactory<T = any> {
    abstract get moduleType(): Type<T>;
    abstract create(parent: Injector, option?: ModuleOption): ModuleRef<T>;
}

@Abstract()
export abstract class ModuleFactoryResolver {
    abstract resolve<T>(type: Type<T>): ModuleFactory<T>;
}
