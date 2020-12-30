import { Type, IInjector, IProvider, Destoryable, Abstract, SymbolType, ProviderType } from '@tsdi/ioc';


/**
 * module injector.
 */
export interface IModuleInjector extends IInjector {
    /**
     * import dependencies moduleRefs 
     */
    readonly deps: ModuleRef[];
    /**
     * export di module.
     * @param ref 
     * @param first 
     */
    addRef(ref: ModuleRef, first?: boolean): this;
    /**
     * has di module.
     * @param ref 
     */
    hasRef(ref: ModuleRef): boolean;
    /**
     * unexport di module.
     * @param ref 
     */
    delRef(ref: ModuleRef): ModuleRef[];
    /**
     * is root or not.
     */
    isRoot(): boolean;
}

/**
 * module exports provider.
 */
export interface IModuleProvider extends IProvider {
    /**
     * export moduleRefs.
     */
    exports: ModuleRef[]
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

