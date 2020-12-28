import {
    Token, lang, SymbolType, Type, IInjector, Provider, IProvider,
    TokenId, tokenId, InstFac, ProviderType, isNil, isClass, getTokenKey
} from '@tsdi/ioc';
import { CoreInjector, IContainer, ICoreInjector } from '@tsdi/core';
import { IModuleInjector, IModuleProvider, ModuleRef } from './ref';
import { ROOT_INJECTOR } from '../tk';



/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @extends {IocCoreService}
 * @implements {IResolver}
 */
export class ModuleInjector extends CoreInjector implements IModuleInjector {


    protected exports: ModuleRef[];

    constructor(parent: ICoreInjector) {
        super(parent);
        this.exports = [];
        this.onDestroy(() => {
            this.exports.forEach(mr => mr.destroy());
            this.exports = [];
        });
    }

    static create(parent: ICoreInjector) {
        return new ModuleInjector(parent);
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return super.hasTokenKey(key) || this.exports.some(r => r.exports.hasTokenKey(key))
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

    hasValue<T>(token: Token<T>): boolean {
        const key = getTokenKey(token);
        return super.hasValue(key) || this.hasValInExports(key);
    }

    getValue<T>(token: Token<T>): T {
        const key = getTokenKey(token);
        return this.factories.get(key)?.value ?? this.getValInExports(key) ?? this.parent?.getValue(key);
    }

    unregister<T>(token: Token<T>): this {
        super.unregister(token);
        this.exports.forEach(r => {
            r.exports.unregister(token);
        });
        lang.remove(this.exports, this.exports?.find(el => el.moduleType === token))
        return this;
    }

    export(ref: ModuleRef, first?: boolean): this {
        if (this.hasExport(ref)) {
            return this;
        }
        if (first) {
            this.exports.unshift(ref);
        } else {
            this.exports.push(ref);
        }
        return this;
    }

    hasExport(ref: ModuleRef): boolean {
        return this.exports.indexOf(ref) >= 0;
    }

    unexport(ref: ModuleRef) {
        return lang.remove(this.exports, ref);
    }

    iterator(callbackfn: (pdr: InstFac, tk: SymbolType, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        if (super.iterator(callbackfn, deep) === false) {
            return false;
        }
        if (this.exports.some(exp => exp.exports.iterator(callbackfn) === false)) {
            return false;
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


export class DefaultModuleRef<T = any> extends ModuleRef<T> {

    private _injector: IModuleInjector;
    private _exports: ModuleProviders;
    private _inst: T;
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
        this._injector = ModuleInjector.create(root);
        if (this.regIn === 'root') {
            this._parent = root;
        }
        this._injector.setValue(ModuleRef, this);
        const pdr = new ModuleProviders(container);
        pdr.moduleInjector = this._injector;
        pdr.export(this.moduleType);
        this._exports = pdr;
    }

    get injector(): IModuleInjector {
        return this._injector;
    }

    get instance(): T {
        if (!this._inst) {
            this._inst = this.injector.getInstance(this.moduleType);
        }
        return this._inst;
    }

    get exports(): IModuleProvider {
        return this._exports;
    }

    protected destroying() {
        const parent = this.parent;
        if (parent instanceof ModuleInjector) {
            parent.unexport(this);
        } else {
            this.exports.iterator((f, k) => {
                parent.unregister(k);
            });
        }
        this._exports.destroy();
        this._injector.destroy();
        this._moduleType = null;
        this._parent = null;
        this._regIn = null;
        this._exports.moduleInjector = null;
        this._exports = null;
        this._injector = null;
        this._inst = null;
    }
}


export class ModuleProviders extends Provider implements IModuleProvider {

    moduleInjector: IModuleInjector;

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        this.getContainer().registerIn(this.moduleInjector, type, provide, singleton);
        provide && this.set(provide, (...pdrs) => this.moduleInjector.getInstance(type, ...pdrs));
        this.export(type);
        return this;
    }

    export(type: Type) {
        this.set(type, (...pdrs) => this.moduleInjector.getInstance(type, ...pdrs));
        this.getContainer().regedState.getRegistered(type).provides?.forEach(p => {
            this.set(p, (...pdrs) => this.moduleInjector.get(p, ...pdrs));
        });
    }
}
