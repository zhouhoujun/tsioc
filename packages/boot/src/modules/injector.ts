import {
    Token, lang, SymbolType, Type, IInjector, IProvider,
    ContextProvider, TokenId, tokenId, InstancePdr, Provider, isDefined, isClass
} from '@tsdi/ioc';
import { CoreInjector, IContainer } from '@tsdi/core';
import { ModuleRef } from './ModuleRef';



/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @extends {IocCoreService}
 * @implements {IResolver}
 */
export class ModuleInjector extends CoreInjector {


    protected exports: ModuleRef[];

    constructor(parent: IContainer) {
        super(parent);
        this.exports = [];
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return super.hasTokenKey(key) || this.exports.some(r => r.exports.hasTokenKey(key))
    }

    getInstance<T>(key: SymbolType<T>, ...providers: Provider[]): T {
        const pdr = this.factories.get(key);
        if (!pdr) {
            let instance: T;
            if (this.exports.some(e => {
                instance = e.exports.getInstance(key);
                return isDefined(instance);
            })) {
                return instance;
            }
            return this.parent?.getInstance(key);
        }
        if (isDefined(pdr.value)) return pdr.value;
        return pdr.fac ? pdr.fac(...providers) ?? null : null;
    }

    hasValue<T>(token: Token<T>): boolean {
        const key = this.getTokenKey(token);
        return super.hasValue(key) || this.hasValInExports(key);
    }

    getValue<T>(token: Token<T>): T {
        const key = this.getTokenKey(token);
        return this.factories.get(key).value ?? this.getValInExports(key) ?? this.parent?.getValue(key);
    }

    clearCache(targetType: Type) {
        super.clearCache(targetType);
        this.exports.forEach(r => {
            r.exports.clearCache(targetType);
        })
        return this;
    }

    unregister<T>(token: Token<T>): this {
        super.unregister(token);
        this.exports.forEach(r => {
            r.exports.unregister(token);
        });
        lang.remove(this.exports, el => el.moduleType === token)
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
        return lang.del(this.exports, ref);
    }

    iterator(callbackfn: (pdr: InstancePdr, tk: SymbolType, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
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
     * @memberof BaseInjector
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        let tokenKey = this.getTokenKey(token);
        return this.factories.get(tokenKey)?.provider
            ?? (isClass(tokenKey) ? tokenKey : (this.getTknPdr(tokenKey) ?? this.parent?.getTokenProvider(tokenKey)));
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

export const MODULE_INJECTOR: TokenId<ModuleInjector> = tokenId<ModuleInjector>('MODULE_INJECTOR');

export class ModuleProviders extends ContextProvider implements IProvider {

    moduleInjector: ModuleInjector;

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
