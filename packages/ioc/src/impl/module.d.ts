import { Injector } from '../injector';
import { ClassRef } from '../metadata/class';
import { ModuleOption, ModuleRef } from '../module.ref';
import { ModuleWithProviders } from '../providers';
import { Type } from '../types';
import { DefaultInjector } from './injector';
/**
 * default modeuleRef implements {@link ModuleRef}
 */
export declare class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance;
    private _type;
    private _typeRefl;
    constructor(moduleType: ClassRef<T>, parent: Injector, option?: ModuleOption);
    protected initWithOptions(option: ModuleOption): any;
    private ininModule;
    get moduleType(): Type<T>;
    get moduleReflect(): ClassRef<T>;
    get injector(): Injector;
    get instance(): T;
    import(typeOrDef: Type | ModuleWithProviders, children?: boolean): void | Promise<void>;
    protected clear(): void;
}
/**
 * create module ref.
 */
export declare function createModuleRef<T>(module: Type<T> | ClassRef<T> | ModuleWithProviders<T>, parent: Injector, option?: ModuleOption): ModuleRef<T>;
