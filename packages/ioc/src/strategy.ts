import { Type } from './types';
import { Abstract } from './decor/decorators';
import { ProviderState, IProvider, ProviderOption, ProviderType, RegisteredState, ResolveOption, TypeOption } from './IInjector';
import { Token, tokenRef } from './tokens';
import { isFunction, getClass, isTypeObject, isDefined } from './utils/chk';
import { cleanObj, mapEach } from './utils/lang';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { TARGET } from './utils/tk';



/**
 * provider strategy.
 */
@Abstract()
export abstract class Strategy {

    protected constructor() { }


    resolve<T>(curr: IProvider, option: ResolveOption<T>, toProvider: (providers: ProviderType[]) => IProvider): T {
        const targetToken = isTypeObject(option.target) ? getClass(option.target) : option.target as Type;

        const pdr = option.target ? toProvider([...option.providers || [], { provide: TARGET, useValue: option.target }]) : toProvider(option.providers || []);
        let inst: T;
        const state = curr.state();
        if (isFunction(targetToken)) {
            inst = this.rsvWithTarget(state, curr, option.token, targetToken, pdr);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        return this.rsvToken(curr, option.token, pdr) ?? this.rsvFailed(state, curr, option, pdr) ?? null;
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    registerIn<T>(injector: IProvider, option: TypeOption<T>) {
        const state = injector.state();
        // make sure class register once.
        if (state.isRegistered(option.type)) {
            if (option?.provide) {
                injector.bindProvider(option.provide, option.type, state.getRegistered(option.type));
            }
            return this;
        }
        if (injector.has(option.type, true)) {
            return this;
        }

        const ctx = {
            injector: injector,
            ...option
        } as DesignContext;
        injector.action().getInstance(DesignLifeScope).register(ctx);
        cleanObj(ctx);

        return this;
    }


    protected rsvWithTarget<T>(state: RegisteredState, curr: IProvider, token: Token<T>, targetToken: Type, pdr: IProvider): T {
        return state?.getTypeProvider(targetToken)?.get(token, pdr) ?? curr.get(tokenRef(token, targetToken), pdr);
    }

    protected rsvToken<T>(curr: IProvider, token: Token<T>, pdr: IProvider): T {
        return pdr?.get(token, pdr) ?? curr.get(token, pdr) ?? curr.parent?.get(token, pdr);
    }

    protected rsvFailed<T>(state: RegisteredState, curr: IProvider, option: ResolveOption<T>, pdr: IProvider): T {
        if (option.regify && isFunction(option.token) && !state?.isRegistered(option.token)) {
            curr.register(option.token as Type);
            return curr.get(option.token, pdr);
        }
        if (option.defaultToken) {
            return curr.get(option.defaultToken, pdr);
        }
        return null;
    }

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
     * get instance.
     * @param key token key.
     * @param curr current provider.
     * @param providers providers
     */
    abstract getInstance<T>(key: Token<T>, curr: IProvider, providers: IProvider): T;
    /**
     * has value
     * @param key token key.
     * @param curr current provider.
     */
    abstract hasValue<T>(key: Token<T>, curr: IProvider): boolean;
    /**
     * get value
     * @param key token key.
     * @param curr current provider.
     */
    abstract getValue<T>(key: Token<T>, curr: IProvider): T;
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
    abstract iterator(map: Map<Token, ProviderState>, callbackfn: (fac: ProviderState, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean): void | boolean;

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

    getInstance<T>(key: Token<T>, curr: IProvider, providers: IProvider) {
        return curr.parent?.toInstance(key, providers);
    }

    hasValue<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.hasValue(key) ?? false;
    }

    getValue<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: IProvider) {
        return curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<Token, ProviderState>, callbackfn: (fac: ProviderState, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean) {
        if (mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

