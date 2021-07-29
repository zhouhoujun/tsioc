import { Type } from './types';
import { Abstract } from './metadata/decor';
import { FacRecord, IInjector } from './interface';
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
    abstract vaildParent(parent: IInjector): boolean;
    /**
     * has token or not.
     * @param key token key.
     * @param curr current provider.
     * @param deep deep or not.
     */
    abstract hasToken<T>(key: Token<T>, curr: IInjector, deep?: boolean): boolean;
    /**
     * has value
     * @param key token key.
     * @param curr current provider.
     */
    abstract hasValue<T>(key: Token<T>, curr: IInjector): boolean;
    /**
     * get instance.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getInstance<T>(key: Token<T>, curr: IInjector): T;
    /**
     * get token provider.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getTokenProvider<T>(key: Token<T>, curr: IInjector): Type<T>;
    /**
     * iterator.
     * @param callbackfn call back func.
     * @param curr current provider.
     * @param deep deep iterator or not.
     */
    abstract iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: IInjector) => void | boolean, curr: IInjector, deep?: boolean): void | boolean;

}


/**
 * default strategy.
 */
export class DefaultStrategy extends Strategy {
    constructor(private vaild?: (parent: IInjector) => boolean) {
        super();
    }

    vaildParent(parent: IInjector) {
        return this.vaild ? this.vaild(parent) : true;
    }

    hasToken<T>(key: Token<T>, curr: IInjector, deep?: boolean) {
        return deep && curr.parent?.has(key);
    }

    hasValue<T>(key: Token<T>, curr: IInjector) {
        return curr.parent?.hasValue(key) ?? false;
    }

    getInstance<T>(key: Token<T>, curr: IInjector) {
        return curr.parent?.get(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: IInjector) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: IInjector) => void | boolean, curr: IInjector, deep?: boolean) {
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

