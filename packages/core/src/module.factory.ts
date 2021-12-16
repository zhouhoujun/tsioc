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
    /**
     * module type.
     */
    abstract get moduleType(): Type<T>;
    /**
     * create new instance of {@link ModuleRef} via the moduleType.
     * @param parent parent injector.
     * @param option create option.
     * @returns  instance of {@link ModuleRef}
     */
    abstract create(parent: Injector, option?: ModuleOption): ModuleRef<T>;
}

/**
 * module factory resolver. resolve {@link ModuleFactory}.
 */
@Abstract()
export abstract class ModuleFactoryResolver {
    static ρNPT = true;
    /**
     * resolve instance of {@link ModuleFactory}.
     * @param type module type or module reflect.
     */
    abstract resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T>;
}
