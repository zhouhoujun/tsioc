import { Type, Registered, IProvider, Abstract, ProviderType, IInjector, Destroyable, Token } from '@tsdi/ioc';

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
    export(type: Type, noRef?: boolean);
}

/**
 * di module ref.
 */
@Abstract()
export abstract class ModuleRef<T = any> implements Destroyable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];

    constructor(protected _type: Type<T>, protected _parent?: IModuleInjector, protected _regIn?: string | 'root') {

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
    abstract get<T>(key: Token<T>, ...providers: ProviderType[]): T;

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

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = [];
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }

    protected abstract destroying(): void;

}
