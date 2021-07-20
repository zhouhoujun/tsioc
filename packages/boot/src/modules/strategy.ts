import { IProvider, isNil, FacRecord, Strategy, Token } from '@tsdi/ioc';
import { ModuleInjector } from '../Context';




/**
 * module injector strategy.
 */
 export class ModuleStrategy<TI extends IProvider = IProvider> extends Strategy {

    constructor(private vaild: (parent: IProvider) => boolean, private getMDRef: (curr: TI) => ModuleInjector[]) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }

    hasToken<T>(key: Token<T>, curr: TI, deep?: boolean) {
        return this.getMDRef(curr).some(r => r.exports.has(key)) || (deep && curr.parent?.has(key));
    }

    hasValue<T>(key: Token<T>, curr: TI) {
        return this.getMDRef(curr).some(r => r.exports.hasValue(key)) || curr.parent?.hasValue(key);
    }

    getInstance<T>(key: Token<T>, curr: TI, provider: IProvider) {
        let inst: T;
        if (this.getMDRef(curr).some(e => {
            inst = e.exports.get(key, provider);
            return !isNil(inst);
        })) return inst;
        return curr.parent?.get(key, provider);
    }

    getTokenProvider<T>(key: Token<T>, curr: TI) {
        let type;
        this.getMDRef(curr).some(r => {
            type = r.exports.getTokenProvider(key);
            return type;
        });
        return type ?? curr.parent?.getTokenProvider(key);
    }

    iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: TI) => void | boolean, curr: TI, deep?: boolean) {
        if (this.getMDRef(curr).some(e => e.exports.iterator(callbackfn) === false)) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }
}
