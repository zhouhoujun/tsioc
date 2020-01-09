import { ContainerProxy, Token, lang, SymbolType, Type, InstanceFactory, IInjector } from '@tsdi/ioc';
import { CoreInjector } from '@tsdi/core';
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

    constructor(factory: ContainerProxy) {
        super(factory);
        this.exports = [];
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return super.hasTokenKey(key) || this.exports.some(r => r.exports.hasTokenKey(key))
    }

    hasSingleton<T>(key: SymbolType<T>): boolean {
        return super.hasSingleton(key) || this.exports.some(r => r.exports.hasSingleton(key));
    }


    protected tryGetSingleton<T>(key: SymbolType<T>): T {
        return this.singletons.has(key) ? this.singletons.get(key)
            : this.exports.find(r => r.exports.hasSingleton(key))?.exports.getSingleton(key);
    }


    protected tryGetFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        return this.factories.has(key) ? this.factories.get(key)
            : this.exports.find(r => r.exports.hasTokenKey(key))?.exports.getTokenFactory(key);
    }

    protected tryGetTokenProvidider<T>(tokenKey: SymbolType<T>): Type<T> {
        if (this.provideTypes.has(tokenKey)) {
            return this.provideTypes.get(tokenKey);
        } else {
            let type;
            this.exports.some(r => {
                type = r.exports.getTokenProvider(tokenKey);
                return type;
            });
            return type || null;
        }
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
        return lang.remove(this.exports, ref);
    }

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IInjector) => void | boolean, deep?: boolean): void | boolean {
        if (super.iterator(callbackfn) === false) {
            return false;
        }
        if (this.exports.some(exp => exp.exports.iterator(callbackfn) === false)) {
            return false;
        }
        if (deep) {
            return this.getContainer().iterator(callbackfn);
        }
    }
}
