import {
    Token, lang, SymbolType, Type, IInjector, Provider, InstFac, ProviderType,
    isNil, isClass, getTokenKey, isPlainObject, InjectorImpl, IProvider, isContainer
} from '@tsdi/ioc';
import { IModuleInjector, IModuleProvider, ModuleRef, ModuleRegistered } from './ref';
import { ROOT_INJECTOR } from '../tk';



/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @extends {IocCoreService}
 * @implements {IResolver}
 */
export class ModuleInjector extends InjectorImpl implements IModuleInjector {


    deps: ModuleRef[];

    private _root: boolean;

    constructor(parent: IInjector) {
        super(parent);
        this._root = isContainer(parent);
        this.deps = [];
        this.onDestroy(() => {
            this.deps.forEach(mr => mr.destroy());
            this.deps = [];
        });
    }

    static create(parent: IInjector) {
        return new ModuleInjector(parent);
    }

    isRoot() {
        return this._root;
    }

    hasTokenKey<T>(key: SymbolType<T>, deep?: boolean): boolean {
        return super.hasTokenKey(key, deep) || this.deps.some(r => r.exports.hasTokenKey(key))
    }

    getInstance<T>(key: SymbolType<T>, ...providers: ProviderType[]): T {
        const pdr = this.factories.get(key);
        if (!pdr) {
            let instance: T;
            if (this.deps.some(e => {
                instance = e.exports.getInstance(key);
                return !isNil(instance);
            })) {
                return instance;
            }
            return this.parent?.getInstance(key);
        }
        if (!isNil(pdr.value)) return pdr.value;
        if (pdr.expires) {
            if (pdr.expires > Date.now()) return pdr.cache;
            pdr.expires = null;
            pdr.cache = null;
        }
        return pdr.fac ? pdr.fac(...providers) ?? null : null;
    }

    hasValue<T>(token: Token<T>, deep?: boolean): boolean {
        const key = getTokenKey(token);
        return super.hasValue(key, deep) || this.hasValInExports(key);
    }

    getValue<T>(token: Token<T>, deep?: boolean): T {
        const key = getTokenKey(token);
        return this.factories.get(key)?.value ?? this.getValInExports(key) ?? (deep !== false ? this.parent?.getValue(key, deep) : null);
    }

    addRef(ref: ModuleRef, first?: boolean): this {
        if (this.hasRef(ref)) {
            return this;
        }
        if (first) {
            this.deps.unshift(ref);
        } else {
            this.deps.push(ref);
        }
        return this;
    }

    hasRef(ref: ModuleRef): boolean {
        return this.deps.indexOf(ref) >= 0;
    }

    delRef(ref: ModuleRef) {
        return lang.remove(this.deps, ref);
    }

    iterator(callbackfn: (pdr: InstFac, tk: SymbolType, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        if (super.iterator(callbackfn) === false) {
            return false;
        }
        if (this.deps.some(exp => exp.exports.iterator(callbackfn) === false)) {
            return false;
        }
        if (deep) {
            return this.parent.iterator(callbackfn, deep);
        }
    }

    /**
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        let tokenKey = getTokenKey(token);
        if (isClass(tokenKey)) return tokenKey;

        return this.factories.get(tokenKey)?.provider
            ?? this.getTknPdr(tokenKey)
            ?? this.parent?.getTokenProvider(tokenKey);
    }

    protected getTknPdr<T>(tokenKey: SymbolType<T>): Type<T> {
        let type;
        this.deps.some(r => {
            type = r.exports.getTokenProvider(tokenKey);
            return type;
        });
        return type || null;

    }

    protected hasValInExports<T>(key: SymbolType<T>): boolean {
        return this.deps.some(r => r.exports.hasValue(key));
    }

    protected getValInExports<T>(key: SymbolType<T>): T {
        return this.deps.find(r => r.exports.hasValue(key))?.exports.getValue(key);
    }
}

/**
 * default moduleRef.
 */
export class DefaultModuleRef<T = any> extends ModuleRef<T> {

    private _injector: IModuleInjector;
    private _exports: ModuleProviders;
    private _inst: T;
    private _imports: Type[];
    constructor(
        moduleType: Type<T>,
        parent?: IModuleInjector,
        regIn?: string
    ) {
        super(moduleType, parent, regIn);
        this.initRef();
    }

    protected initRef() {
        const container = this.parent.getContainer();
        const root = container.getValue(ROOT_INJECTOR);
        if (this.regIn === 'root') {
            this._parent = root;
        }
        this._injector = ModuleInjector.create(root);
        this._injector.setValue(ModuleRef, this);
        const pdr = new ModuleProviders(container);
        pdr.mdInjector = this._injector;
        pdr.export(this.type);
        this._exports = pdr;
    }


    get injector(): IModuleInjector {
        return this._injector;
    }

    get instance(): T {
        if (!this._inst) {
            this._inst = this.injector.getInstance(this.type);
        }
        return this._inst;
    }

    get<T>(key: SymbolType<T>, ...providers: ProviderType[]): T {
        return this.injector.getInstance(key, ...providers);
    }

    get imports(): Type[] {
        return this._imports || [];
    }
    set imports(imports: Type[]) {
        this._imports = imports;
    }

    get exports(): IModuleProvider {
        return this._exports;
    }

    protected destroying() {
        const parent = this.parent;
        if (parent instanceof ModuleInjector) {
            parent.delRef(this);
        } else {
            this.exports.iterator((f, k) => {
                parent.unregister(k);
            });
        }
        this._exports.destroy();
        this._injector.destroy();
        this._type = null;
        this._parent = null;
        this._regIn = null;
        this._exports = null;
        this._imports = null;
        this._injector = null;
        this._inst = null;
    }
}

/**
 * module providers.
 */
export class ModuleProviders extends Provider implements IModuleProvider {

    constructor(parent: IProvider, type?: string) {
        super(parent, type);
        this.onDestroy(() => {
            this.mdInjector = null;
            this.exports.forEach(e => e.destroy());
            this.exports = [];
        });
    }
    /**
     * module Injector
     */
    mdInjector: IModuleInjector;
    /**
     * module injector.
     */
    exports: ModuleRef[] = [];
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    registerType<T>(type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    registerType<T>(type: Type<T>, provide?: any, singleton?: boolean): this {
        if (isPlainObject(provide)) {
            this.getContainer()?.registerIn(this.mdInjector, type, provide as any);
        } else {
            this.getContainer()?.registerIn(this.mdInjector, type, { provide, singleton });
        }
        provide && this.set(provide, (...pdrs) => this.mdInjector.getInstance(type, ...pdrs));
        this.export(type);
        return this;
    }

    export(type: Type) {
        const state = this.getContainer().regedState;
        if (!state.isRegistered(type)) {
            this.mdInjector.registerType(type);
        }
        this.set(type, (...pdrs) => this.mdInjector.getInstance(type, ...pdrs));
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this.set(p, (...pdrs) => this.mdInjector.get(p, ...pdrs));
        });
        if (reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }

    hasTokenKey<T>(key: SymbolType<T>, deep?: boolean): boolean {
        return super.hasTokenKey(key, deep) || this.exports.some(r => r.exports.hasTokenKey(key))
    }

    getInstance<T>(key: SymbolType<T>, ...providers: ProviderType[]): T {
        const pdr = this.factories.get(key);
        if (!pdr) {
            let instance: T;
            if (this.exports.some(e => {
                instance = e.exports.getInstance(key);
                return !isNil(instance);
            })) {
                return instance;
            }
            return null;
        }
        if (!isNil(pdr.value)) return pdr.value;
        if (pdr.expires) {
            if (pdr.expires > Date.now()) return pdr.cache;
            pdr.expires = null;
            pdr.cache = null;
        }
        return pdr.fac ? pdr.fac(...providers) ?? null : null;
    }

    iterator(callbackfn: (pdr: InstFac, tk: SymbolType, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        if (super.iterator(callbackfn) === false) {
            return false;
        }
        if (this.exports.some(exp => exp.exports.iterator(callbackfn) === false)) {
            return false;
        }
    }

    hasValue<T>(token: Token<T>, deep?: boolean): boolean {
        const key = getTokenKey(token);
        return super.hasValue(key, deep) || this.hasValInExports(key);
    }

    getValue<T>(token: Token<T>, deep?: boolean): T {
        const key = getTokenKey(token);
        return this.factories.get(key)?.value ?? this.getValInExports(key) ?? (deep !== false ? this.parent.getValue(key, deep) : null);
    }

    /**
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        let tokenKey = getTokenKey(token);
        if (isClass(tokenKey)) return tokenKey;

        return this.factories.get(tokenKey)?.provider
            ?? this.getTknPdr(tokenKey);
    }

    protected getTknPdr<T>(tokenKey: SymbolType<T>): Type<T> {
        let type;
        this.exports.some(r => {
            type = r.exports.getTokenProvider(tokenKey);
            return type;
        });
        return type || null;
    }

    protected hasValInExports<T>(key: SymbolType<T>): boolean {
        return this.exports.some(r => r.exports.hasValue(key));
    }

    protected getValInExports<T>(key: SymbolType<T>): T {
        return this.exports.find(r => r.exports.hasValue(key))?.exports.getValue(key);
    }
}
