import { Abstract, Injector, ModuleReflect, ProviderType, Type } from '@tsdi/ioc';
import { ModuleRef, ModuleType } from './module.ref';


/**
 * module option.
 */
export interface ModuleOption {
    /**
     *  providers.
     */
    providers?: ProviderType[];
    /**
     * dependence modules. register before module injector init.
     */
    deps?: ModuleType[];
    /**
     * register modules after module injector inited.
     */
    uses?: ModuleType[];
    /**
     * moduel scope.
     */
    scope?: 'root' | string;

    /**
     * is static or not.
     */
    isStatic?: boolean;

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
    static diNPT = true;
    /**
     * resolve instance of {@link ModuleFactory}.
     * @param type module type or module reflect.
     */
    abstract resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T>;
}
