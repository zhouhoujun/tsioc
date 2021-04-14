import { Type } from './types';
import { Abstract } from './decor/decorators';
import { IProvider, ProviderOption, RegisteredState, ResolveOption } from './IInjector';
import { InstFac, ProviderType, Token, tokenRef } from './tokens';
import { isFunction, getClass, isTypeObject, isDefined } from './utils/chk';
import { cleanObj, mapEach } from './utils/lang';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { IContainer } from './IContainer';



/**
 * provider strategy.
 */
@Abstract()
export abstract class Strategy {

    protected constructor(public container: IContainer) { }


    resolve<T>(curr: IProvider, option: ResolveOption<T>, toProvider: (...providers: ProviderType[]) => IProvider): T {
        const targetToken = isTypeObject(option.target) ? getClass(option.target) : option.target as Type;
        const pdr = toProvider(...option.providers || []);
        let inst: T;
        const regState = this.container.regedState;
        if (isFunction(targetToken)) {
            inst = this.rsvWithTarget(regState, curr, option.token, targetToken, pdr);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        return this.rsvToken(curr, option.token, pdr) ?? this.rsvFailed(regState, curr, option, pdr) ?? null;
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IProvider, type: Type<T>, options?: ProviderOption) {
        const regState = this.container.regedState;
        // make sure class register once.
        if (regState.isRegistered(type)) {
            if (options?.provide) {
                injector.bindProvider(options.provide, type, regState.getRegistered(type));
            }
            return this;
        }
        if (injector.has(type, true)) {
            return this;
        }

        const ctx = {
            injector,
            ...options,
            token: options?.provide,
            type
        } as DesignContext;
        this.container.provider.getInstance(DesignLifeScope).register(ctx);
        cleanObj(ctx);

        return this;
    }


    protected rsvWithTarget<T>(regState: RegisteredState, curr: IProvider, token: Token<T>, targetToken: Type, pdr: IProvider): T {
        return regState?.getTypeProvider(targetToken)?.get(token, pdr) ?? curr.get(tokenRef(token, targetToken), pdr);
    }

    protected rsvToken<T>(curr: IProvider, token: Token<T>, pdr: IProvider): T {
        return pdr?.get(token, pdr) ?? curr.get(token, pdr) ?? curr.parent?.get(token, pdr);
    }

    protected rsvFailed<T>(regState: RegisteredState, curr: IProvider, option: ResolveOption<T>, pdr: IProvider): T {
        if (option.regify && isFunction(option.token) && !regState?.isRegistered(option.token)) {
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
    abstract getInstance<T>(key: Token<T>, curr: IProvider, ...providers: ProviderType[]): T;
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
    abstract iterator(map: Map<Token, InstFac>, callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean): void | boolean;

}

/**
 * default strategy.
 */
export class DefaultStrategy extends Strategy {
    constructor(container: IContainer, private vaild: (parent: IProvider) => boolean) {
        super(container);
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }

    hasToken<T>(key: Token<T>, curr: IProvider, deep?: boolean) {
        return deep && curr.parent?.has(key);
    }

    getInstance<T>(key: Token<T>, curr: IProvider, ...providers: ProviderType[]) {
        return curr.parent?.getInstance(key, ...providers);
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

    iterator(map: Map<Token, InstFac>, callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, curr: IProvider, deep?: boolean) {
        if (mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }

}

