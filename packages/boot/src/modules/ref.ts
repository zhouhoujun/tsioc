import { ICoreInjector } from '@tsdi/core';
import { Type, Registered, Destoryable, IProvider, Abstract, SymbolType, ProviderType } from '@tsdi/ioc';

/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}

/**
 * module injector.
 */
export interface IModuleInjector extends ICoreInjector {
    exports: ModuleRef[];
    /**
     * export di module.
     * @param ref 
     * @param first 
     */
    export(ref: ModuleRef, first?: boolean): this;
    /**
     * has di module.
     * @param ref 
     */
    hasExport(ref: ModuleRef): boolean;
    /**
     * unexport di module.
     * @param ref 
     */
    unexport(ref: ModuleRef): ModuleRef[];
}

/**
 * module exports provider.
 */
export interface IModuleProvider extends IProvider {
    /**
     * export type.
     * @param type 
     */
    export(type: Type);
}

/**
 * di module ref.
 */
@Abstract()
export abstract class ModuleRef<T = any> extends Destoryable {

    constructor(protected _moduleType: Type<T>, protected _parent?: IModuleInjector, protected _regIn?: string | 'root') {
        super();
    }

    get moduleType(): Type<T> {
        return this._moduleType;
    }

    get parent(): IModuleInjector {
        return this._parent;
    }

    get regIn(): string | 'root' {
        return this._regIn;
    }

    abstract getInstance<T>(key: SymbolType<T>, ...providers: ProviderType[]): T

    abstract get imports(): Type[];

    /**
     * injecor of current module ref.
     */
    abstract get injector(): IModuleInjector;
    /**
     * di module instance.
     */
    abstract get instance(): T;
    /**
     * di module exports.
     */
    abstract get exports(): IModuleProvider;

}
