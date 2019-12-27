import { Injector, ContainerFactory, Token, lang, SymbolType, Type, InstanceFactory, IInjector } from '@tsdi/ioc';
import { ModuleRef } from './ModuleRef';



/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @extends {IocCoreService}
 * @implements {IResolver}
 */
export class ModuleInjector extends Injector {


    protected exports: ModuleRef[];

    constructor(factory: ContainerFactory) {
        super(factory);
        this.exports = [];
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return this.factories.has(key) || this.exports.some(r => r.exports.hasTokenKey(key))
    }

    getTokenFactory<T>(key: SymbolType<T>): InstanceFactory<T> {
        if (this.hasTokenKey(key)) {
            if (this.factories.has(key)) {
                return this.factories.get(key);
            }
            let mref = this.exports.find(r => r.exports.hasTokenKey(key));
            if (mref) {
                return mref.exports.getTokenFactory(key);
            }
        }
        return this.tryGetInRoot(key);
    }

    getTokenProvider<T>(token: Token<T>): Type<T> {
        let type = super.getTokenProvider(token);
        if (!type) {
            this.exports.some(r => {
                type = r.exports.getTokenProvider(token);
                return type;
            });
        }
        return type;
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
        if (this.exports.some(exp => {
            return exp.exports.iterator(callbackfn);
        }) === false) {
            return false;
        }
        if (deep) {
            return this.getContainer().iterator(callbackfn);
        }
    }
}
