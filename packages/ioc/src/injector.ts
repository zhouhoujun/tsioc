import { Modules, Type } from './types';
import { ResolveOption } from './actions/res';
import { Abstract } from './decor/decorators';
import { Destoryable } from './Destoryable';
import { IInjector, IProvider } from './IInjector';
import { MethodType } from './IMethodAccessor';
import { StaticProviders } from './providers';
import { FactoryLike, getTokenKey, InjectReference, Factory, InstFac, isToken, Provider, Registration, SymbolType, Token } from './tokens';
import { isArray, isBaseObject, isClass, isDefined, isFunction, isNull, isString, isUndefined, lang } from './utils/lang';
import { PROVIDERS } from './utils/tk';

/**
 * provider container.
 *
 * @export
 * @class DIProvider
 * @extends {Injector}
 */
export class DIProvider extends Destoryable implements IProvider {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<SymbolType, InstFac>;

    constructor(readonly parent?: IProvider) {
        super();
        this.factories = new Map();
    }

    get size(): number {
        return this.factories.size;
    }

    getContainer() {
        return this.parent?.getContainer();
    }

    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof BaseInjector
     */
    getToken<T>(token: Token<T>, alias?: string): Token<T> {
        if (alias) {
            return new Registration(token, alias);
        }
        return token;
    }


    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof BaseInjector
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        return getTokenKey(token, alias);
    }

    /**
     * set token factory.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {(Factory<T> | InstFac<T>)} fac
     * @param {Type<T>} [provider]
     * @returns {this}
     * @memberof BaseInjector
     */
    set<T>(provide: Token<T>, fac: Factory<T> | InstFac<T>, provider?: Type<T>): this {
        let key = this.getTokenKey(provide);
        if (!key) return this;
        if (isFunction(fac)) {
            if (isClass(provider)) {
                this.factories.set(provider, { fac, provider });
                this.factories.set(key, { fac, provider });
            } else {
                this.factories.set(key, { fac, provider: isClass(key) ? key : undefined });
            }
        } else {
            this.factories.set(key, { ...this.factories.get(key), ...fac });
        }
        return this;
    }

    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        this.getContainer()?.registerIn(this, type, provide, singleton);
        return this;
    }

    /**
     * inject providers.
     *
     * @param {...Provider[]} providers
     * @returns {this}
     * @memberof Injector
     */
    inject(...providers: Provider[]): this {
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.use(...p);
            } else if (p instanceof DIProvider) {
                this.copy(p);
            } else if (isClass(p)) {
                this.registerType(p);
            } else if (isBaseObject(p)) {
                let pr = p as StaticProviders;
                if (isToken(pr.provide)) {
                    let provide = this.getTokenKey(pr.provide);
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d)) {
                                this.registerType(d);
                            }
                        });
                    }
                    if (isDefined(pr.useValue)) {
                        let val = pr.useValue;
                        this.setValue(provide, val);
                    } else if (isClass(pr.useClass)) {
                        this.registerType(pr.useClass, pr.provide, pr.singleton);
                    } else if (isFunction(pr.useFactory)) {
                        let deps = pr.deps;
                        this.set(provide, (...providers: Provider[]) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
                                    if (isToken(d)) {
                                        return this.get(d, ...providers);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args.concat(providers));
                        });
                    } else if (isToken(pr.useExisting)) {
                        this.set(provide, (...providers) => this.get(pr.useExisting, ...providers));
                    } else if (isClass(pr.provide)) {
                        let Ctor = pr.provide;
                        let deps = pr.deps;
                        this.set(provide, (...providers) => {
                            let args = [];
                            if (isArray(deps) && deps.length) {
                                args = deps.map(d => {
                                    if (isToken(d)) {
                                        return this.get(d, ...providers);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return new Ctor(...args);
                        });
                    }
                }
            }
        });

        return this;
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IInjector
     */
    use(...modules: Modules[]): Type[] {
        let types = lang.getTypes(...modules);
        types.forEach(ty => this.registerType(ty));
        return types;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>): boolean;
    /**
     *  has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>, alias: string): boolean;
    /**
     *  has register token in current injector.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {string} alias addtion alias.
     * @returns {boolean}
     * @memberof IInjector
     */
    has<T>(token: Token<T>, alias?: string): boolean {
        return this.hasTokenKey(this.getTokenKey(token, alias));
    }
    /**
     * has register.
     * @param token the token
     * @param alias addtion alias
     */
    hasRegister<T>(token: Token<T>, alias?: string): boolean {
        let key = this.getTokenKey(token, alias);
        return this.hasTokenKey(key) || this.parent?.hasRegister(key);
    }

    hasTokenKey<T>(key: SymbolType<T>): boolean {
        return this.factories.has(key);
    }

    hasValue<T>(token: Token<T>): boolean {
        const key = this.getTokenKey(token);
        return isDefined(this.factories.get(key)?.value) || this.parent?.hasValue(key);
    }

    getValue<T>(token: Token<T>): T {
        const key = this.getTokenKey(token);
        return this.factories.get(key)?.value ?? this.parent?.getValue(key);
    }

    getFirstValue<T>(...tokens: Token<T>[]): T {
        let value: T;
        tokens.some(k => {
            value = this.getValue(k);
            return isDefined(value);
        })
        return value;
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        const key = this.getTokenKey(token);
        const pds = this.factories.get(key);
        if (provider && isClass(provider)) {
            this.factories.set(key, { ...pds, value, provider });
            this.factories.set(provider, { ...this.factories.get(provider), value, provider });
        } else {
            this.factories.set(key, { ...pds, value });
        }
        return this;
    }

    delValue(token: Token) {
        const key = this.getTokenKey(token);
        const pdr = this.factories.get(key);
        if (!pdr.fac) {
            this.factories.delete(key);
        } else {
            pdr.value = null;
        }
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | Provider)} [alias]
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof BaseInjector
     */
    get<T>(token: Token<T>, alias?: string | Provider, ...providers: Provider[]): T {
        let key;
        if (isString(alias)) {
            key = this.getTokenKey(token, alias);
        } else {
            key = this.getTokenKey(token);
            if (alias) {
                providers.unshift(alias);
            }
        }
        return this.getInstance(key, ...providers);
    }

    getInstance<T>(key: SymbolType<T>, ...providers: Provider[]): T {
        const pdr = this.factories.get(key);
        if (!pdr) return this.parent?.getInstance(key);
        if (isDefined(pdr.value)) return pdr.value;
        if (pdr.expires) {
            if (pdr.expires > Date.now()) return pdr.cache;
            pdr.expires = null;
            pdr.cache = null;
        }
        return pdr.fac ? pdr.fac(...providers) ?? null : null;
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
        if (isClass(tokenKey)) return tokenKey;
        return this.factories.get(tokenKey)?.provider ?? this.parent?.getTokenProvider(tokenKey);
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @param {ResoveWay} [resway]
     * @returns {this}
     * @memberof BaseInjector
     */
    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.has(key)) {
            this.factories.delete(key);
            if (isClass(key)) {
                let keys = [];
                this.delValue(key);
                keys.forEach(k => {
                    this.factories.delete(key);
                });
                this.getContainer().regedState.deleteType(key);
            }
        }
        return this;
    }

    iterator(callbackfn: (fac: InstFac, key: SymbolType, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
        let flag = !Array.from(this.factories.keys()).some(tk => {
            return callbackfn(this.factories.get(tk), tk, this) === false;
        });
        if (flag !== false && deep) {
            return this.parent?.iterator(callbackfn);
        }
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: IProvider, filter?: (key: SymbolType) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as DIProvider, this, filter);
        return this;
    }

    clone(to?: IProvider): IProvider;
    clone(filter: (key: SymbolType) => boolean, to?: IProvider): IProvider;
    clone(filter?: any, to?: IProvider): IProvider {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (lang.getClass(this))(this.parent);
        this.merge(this, to as DIProvider, filter);
        return to;
    }


    protected merge(from: DIProvider, to: DIProvider, filter?: (key: SymbolType) => boolean) {
        from.factories.forEach((pdr, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, pdr);
        });
    }

    protected destroying() {
        this.factories.clear();
        this.factories = null;
    }

    static create(providers: StaticProviders[], parent: IProvider) {
        return new DIProvider(parent).inject(...providers)
    }
}



@Abstract()
export abstract class Injector extends DIProvider implements IInjector {

    constructor(readonly parent?: IInjector) {
        super(parent);
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [value]
     * @returns {this}
     * @memberOf BaseInjector
     */
    abstract register<T>(token: Token<T>, fac?: FactoryLike<T>): this;

    /**
     * register stingleton type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {FactoryLike<T>} [fac]
     * @returns {this}
     * @memberOf Container
     */
    abstract registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this;

    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} provider
     * @returns {this}
     * @memberof BaseInjector
     */
    bindProvider<T>(provide: Token<T>, provider: Type<T>): this {
        const provideKey = this.getTokenKey(provide);
        if (!provideKey) {
            return this;
        }
        if (isClass(provider)) {
            const pdr = this.factories.get(provideKey);
            const type = provider;
            this.registerType(type);
            this.factories.set(provideKey, { ...pdr, fac: (...providers) => this.getInstance(type, ...providers), provider: type });
        }
        return this;
    }

    /**
     *  bind provider ref to target.
     * @param target the target, provide ref to.
     * @param provide provide token.
     * @param provider provider factory or token.
     * @param alias alias.
     */
    bindRefProvider<T>(target: Token, provide: Token<T>, provider: Type<T>, alias?: string): InjectReference<T> {
        let refToken = new InjectReference(this.getTokenKey(provide, alias), target);
        this.bindProvider(refToken, provider);
        return refToken;
    }

    bindTagProvider(target: Token, ...providers: Provider[]): InjectReference<IProvider> {
        let refToken = new InjectReference(PROVIDERS, target);
        if (this.has(refToken)) {
            this.get(refToken).inject(...providers);
        } else {
            this.registerSingleton(refToken, this.get(PROVIDERS).inject(...providers));
        }
        return refToken;
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IInjector
     */
    use(...modules: Modules[]): Type[] {
        let types = lang.getTypes(...modules);
        types.forEach(ty => this.registerType(ty));
        return types;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    abstract resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: Provider[]): T;

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;

    clone(to?: Injector): IInjector;
    clone(filter: (key: SymbolType) => boolean, to?: IInjector): IInjector;
    clone(filter?: any, to?: Injector): IInjector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (lang.getClass(this))(this.parent);
        this.merge(this, to as Injector, filter);
        return to;
    }
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is IProvider {
    return target instanceof DIProvider;
}


/**
 * context provider.
 *
 * @export
 * @class ContextProvider
 * @extends {Injector}
 */
export class ContextProvider extends DIProvider implements IProvider {

}

/**
 * invoked provider
 */
export class InvokedProvider extends DIProvider implements IProvider {

}


