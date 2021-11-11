import { Modules, Type } from './types';
import { Abstract } from './metadata/fac';
import { ModuleRef } from './module.ref';
import { ProviderType } from './providers';
import { ModuleReflect } from './metadata/type';
import { Injector } from './injector';


/**
 * module option.
 */
export interface ModuleOption {
    /**
     *  providers.
     */
    providers?: ProviderType[];
    /**
     * dependence types.
     */
    deps?: Modules[];

    scope?: 'root' | string;
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
    abstract resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T>;
}
