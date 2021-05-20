import { Type } from './types';
import { Abstract } from './decor/decorators';
import { FacRecord, IProvider } from './IInjector';
import { Token } from './tokens';
import { mapEach } from './utils/lang';



/**
 * provider strategy.
 */
@Abstract()
export abstract class Strategy {

    protected constructor() { }

    /**
     * vaild parent.
     * @param parent parent provider.
     */
    abstract vaildParent(parent: IProvider): boolean;
    /**
     * has token or not.
     * @param key token key.
     * @param curr current provider.
     * @param deep deep or not.
     */
    abstract hasToken<T>(key: Token<T>, curr: IProvider, deep?: boolean): boolean;
    /**
     * has value
     * @param key token key.
     * @param curr current provider.
     */
    abstract hasValue<T>(key: Token<T>, curr: IProvider): boolean;
    /**
     * get instance.
     * @param key token key.
     * @param curr current provider.
     * @param providers providers
     */
    abstract getInstance<T>(key: Token<T>, curr: IProvider, providers: IProvider): T;
    /**
     * get token provider.
     * @param key token key.
     * @param curr current provider.
     */
    abstract getTokenProvider<T>(key: Token<T>, curr: IProvider): Type<T>;
    /**
     * iterator.
     * @param map the fac map.
     * @param callbackfn call back func.
     * @param curr current provider.
     * @param deep deep iterator or not.
     */
    abstract iterator(map: Map<Token, FacRecord>, callbackfn: (fac: FacRecord, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean): void | boolean;

}



/**
 * default strategy.
 */
export class DefaultStrategy extends Strategy {
    constructor(private vaild?: (parent: IProvider) => boolean) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild ? this.vaild(parent) : true;
    }

    hasToken<T>(key: Token<T>, curr: IProvider, deep?: boolean) {
        return deep && curr.parent?.has(key);
    }

    hasValue<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.hasValue(key) ?? false;
    }

    getInstance<T>(key: Token<T>, curr: IProvider, providers: IProvider) {
        return curr.parent?.getInstance(key, providers);
    }

    getTokenProvider<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<Token, FacRecord>, callbackfn: (fac: FacRecord, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean) {
        if (mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

