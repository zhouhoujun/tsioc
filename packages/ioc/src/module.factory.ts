import { Modules, Type } from './types';
import { Injector, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { ProvidedInMetadata } from './metadata/meta';
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
}

/**
 * module factory to create instace {@link ModuleRef}.
 */
@Abstract()
export abstract class ModuleFactory<T = any> {
    abstract get moduleType(): Type<T>;
    abstract create(parent: Injector, option?: ModuleOption): ModuleRef<T>;
}

/**
 * module factory resolver. resolve {@link ModuleFactory}.
 */
@Abstract()
export abstract class ModuleFactoryResolver {
    abstract resolve<T>(type: Type<T>): ModuleFactory<T>;
}
