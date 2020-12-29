import { Type, Registered, Destoryable, IProvider, Abstract, SymbolType, ProviderType, IInjector } from '@tsdi/ioc';

/**
 * module registered state.
 */
export interface ModuleRegistered extends Registered {
    moduleRef?: ModuleRef;
}

/**
 * module injector.
 */
export interface IModuleInjector extends IInjector {
    /**
     * export moduleRef
     */
    readonly exports: ModuleRef[];
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

    constructor(protected _type: Type<T>, protected _parent?: IModuleInjector, protected _regIn?: string | 'root') {
        super();
    }

    /**
     * module type.
     */
    get type(): Type<T> {
        return this._type;
    }

    get parent(): IModuleInjector {
        return this._parent;
    }

    get regIn(): string | 'root' {
        return this._regIn;
    }

    /**
     * get the token instance registered in this di module.
     * @param key token key
     * @param providers param providers.
     */
    abstract get<T>(key: SymbolType<T>, ...providers: ProviderType[]): T;

    /**
     * get module import types.
     */
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
