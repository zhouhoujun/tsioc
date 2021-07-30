import { Type } from './types';
import { Abstract } from './metadata/fac';
import { FacRecord } from './interface';
import { Injector } from './injector';
import { Token } from './tokens';



/**
 * provider strategy.
 */
@Abstract()
export abstract class Strategy {

    /**
     * vaild parent.
     * @param parent parent provider.
     */
    abstract vaildParent(parent: Injector): boolean;
    /**
     * has token or not.
     * @param key token key.
     * @param curr current provider.
     * @param deep deep or not.
     */
    abstract hasToken<T>(key: Token<T>, curr: Injector, deep?: boolean): boolean;
    /**
     * has value
     * @param key token key.
     * @param curr current provider.
     */
    abstract hasValue<T>(key: Token<T>, curr: Injector): boolean;
    /**
     * get instance.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getInstance<T>(key: Token<T>, curr: Injector): T;
    /**
     * get token provider.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getTokenProvider<T>(key: Token<T>, curr: Injector): Type<T>;
    /**
     * iterator.
     * @param callbackfn call back func.
     * @param curr current provider.
     * @param deep deep iterator or not.
     */
    abstract iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: Injector) => void | boolean, curr: Injector, deep?: boolean): void | boolean;

}


/**
 * default strategy.
 */
export class DefaultStrategy extends Strategy {
    constructor(private vaild?: (parent: Injector) => boolean) {
        super();
    }

    vaildParent(parent: Injector) {
        return this.vaild ? this.vaild(parent) : true;
    }

    hasToken<T>(key: Token<T>, curr: Injector, deep?: boolean) {
        return deep && curr.parent?.has(key);
    }

    hasValue<T>(key: Token<T>, curr: Injector) {
        return curr.parent?.hasValue(key) ?? false;
    }

    getInstance<T>(key: Token<T>, curr: Injector) {
        return curr.parent?.get(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: Injector) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: Injector) => void | boolean, curr: Injector, deep?: boolean) {
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

