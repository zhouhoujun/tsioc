import { Abstract, Injector, ModuleReflect, Modules, ProviderType, Type } from '@tsdi/ioc';
import { ModuleRef } from './module.ref';


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