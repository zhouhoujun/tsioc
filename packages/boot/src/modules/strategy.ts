import { IProvider, isNil, lang, ProviderState, Strategy, Token } from '@tsdi/ioc';
import { ModuleContext } from '../Context';




/**
 * module injector strategy.
 */
 export class ModuleStrategy<TI extends IProvider = IProvider> extends Strategy {

    constructor(private vaild: (parent: IProvider) => boolean, private getMDRef: (curr: TI) => ModuleContext[]) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }


    hasToken<T>(key: Token<T>, curr: TI, deep?: boolean) {
        return this.getMDRef(curr).some(r => r.injector.exports.has(key)) || (deep && curr.parent?.has(key));
    }

    getInstance<T>(key: Token<T>, curr: TI, provider: IProvider) {
        let inst: T;
        if (this.getMDRef(curr).some(e => {
            inst = e.injector.exports.toInstance(key, provider);
            return !isNil(inst);
        })) return inst;
        return curr.parent?.toInstance(key, provider);
    }

    hasValue<T>(key: Token<T>, curr: TI) {
        return this.getMDRef(curr).some(r => r.injector.exports.hasValue(key)) || curr.parent?.hasValue(key);
    }

    getValue<T>(key: Token<T>, curr: TI) {
        let value: T;
        if (this.getMDRef(curr).some(r => {
            value = r.injector.exports.getValue(key);
            return !isNil(value)
        })) return value;
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: TI) {
        let type;
        this.getMDRef(curr).some(r => {
            type = r.injector.exports.getTokenProvider(key);
            return type;
        });
        return type ?? curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<Token, ProviderState>, callbackfn: (fac: ProviderState, key: Token, resolvor?: TI) => void | boolean, curr: TI, deep?: boolean) {
        if (lang.mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (this.getMDRef(curr).some(exp => exp.injector.exports.iterator(callbackfn) === false)) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }
}
