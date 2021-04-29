import { LoadType, Modules, Type } from './types';
import { Abstract } from './decor/decorators';
import { MethodType } from './Invoker';
import { KeyValueProvider, StaticProviders } from './providers';
import {
    ClassRegister, Factory, FactoryLike, IActionProvider, IInjector, IModuleLoader, InstFac, IProvider, ProviderOption, ProviderType, RegisteredState,
    RegisterOption, ResolveOption, ServiceOption, ServicesOption, ValueRegister
} from './IInjector';
import { isToken, Token } from './tokens';
import { isArray, isPlainObject, isClass, isNil, isFunction, isNull, isString, isUndefined, getClass } from './utils/chk';
import { IContainer } from './IContainer';
import { cleanObj, getTypes, remove } from './utils/lang';
import { Registered } from './decor/type';
import { INJECTOR } from './utils/tk';
import { DefaultStrategy, Strategy } from './strategy';


/**
 * provider default startegy.
 */
export const providerStrategy = new DefaultStrategy();

/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class Provider implements IProvider {
    /**
     * none poincut for aop.
     */
    static ρNPT = true;

    private _destroyed = false;
    protected _container: IContainer;
    private _dsryCbs: (() => void)[] = [];
    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<Token, InstFac>;
    protected destCb: () => void;

    constructor(public parent: IProvider, protected strategy: Strategy = providerStrategy) {
        this.factories = new Map();
        parent && this.init(parent);
    }

    protected init(parent: IProvider) {
        this.destCb = () => this.destroy();
        this._container = parent.getContainer();
        if (this.strategy.vaildParent(parent)) {
            parent.onDestroy(this.destCb);
        } else {
            this._container.onDestroy(this.destCb);
            this.parent = null;
        }
    }

    get size(): number {
        return this.factories.size;
    }

    getContainer(): IContainer {
        return this._container;
    }

    /**
     * registered state.
     */
    state(): RegisteredState {
        return this._container?.state();
    }

    /**
     * action provider.
     */
    action(): IActionProvider {
        return this._container?.action();
    }

    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {InstFac<T>} fac
     * @param {boolean} [replace] replace only.
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: InstFac<T>, replace?: boolean): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Factory<T>} fac
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(provide: Token<T>, fac: Factory<T>, providerType?: Type<T>): this;
    set<T>(provide: Token, fac: Factory<T> | InstFac<T>, pdOrRep?: Type<T> | boolean): this {
        const old = this.factories.get(provide);
        if (isFunction(fac)) {
            let useClass = pdOrRep as Type;
            if (old) {
                old.fac = fac;
                if (useClass) old.useClass = useClass;
            } else {
                this.factories.set(provide, { fac, useClass });
            }
        } else if (fac) {
            if (old && !pdOrRep) {
                Object.assign(old, fac);
            } else {
                this.factories.set(provide, fac);
            }
        }
        return this;
    }

    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provider] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    register<T>(token: Token<T>, provider: FactoryLike<T>, singleton?: boolean): this;
    register(token: any, provider?: any, singleton?: boolean): this {
        if (provider) {
            this.regToken(token, provider, singleton);
        } else {
            if (isFunction(token)) {
                this.regType(token);
            } else {
                if ((token as ClassRegister).useClass) {
                    this.regType((token as ClassRegister).useClass, token as ClassRegister);
                } else if ((token as ValueRegister).provide) {
                    this.setValue((token as ValueRegister).provide, (token as ValueRegister).useValue);
                }
            }
        }
        return this;
    }

    protected regType<T>(target: Type<T>, option?: ProviderOption) {
        this.strategy.registerIn(this, target, option);
    }

    protected regToken<T>(token: Token<T>, provider: FactoryLike<T>, singleton?: boolean) {
        if (isClass(provider)) {
            this.strategy.registerIn(this, provider, { provide: token, singleton });
        } else {
            const classFactory = this.createCustomFactory(token, provider, singleton);
            this.set(token, classFactory);
        }
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this {
        providers.length && providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isArray(p)) {
                this.use(...p);
            } else if (p instanceof Provider) {
                this.copy(p);
            } else if (isClass(p)) {
                this.regType(p);
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { useValue });
                });
            } else if (isPlainObject(p) && (p as StaticProviders).provide) {
                if ((p as StaticProviders).provide) {
                    this.factories.set((p as StaticProviders).provide, p as StaticProviders);
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
     */
    use(...modules: Modules[]): Type[] {
        let types = getTypes(...modules);
        types.forEach(ty => this.regType(ty));
        return types;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, deep?: boolean): boolean {
        return this.factories.has(token) || (this.strategy.hasToken(token, this, deep) ?? false);
    }

    hasValue<T>(token: Token<T>): boolean {
        return !isNil(this.factories.get(token)?.useValue) || (this.strategy.hasValue(token, this) ?? false);
    }

    getValue<T>(token: Token<T>): T {
        return this.factories.get(token)?.useValue ?? this.strategy.getValue(token, this) ?? null;
    }

    setValue<T>(token: Token<T>, useValue: T, useClass?: Type<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            isp.useValue = useValue;
            if (useClass) isp.useClass = useClass;
        } else {
            this.factories.set(token, { useValue, useClass });
        }
        return this;
    }

    delValue(token: Token) {
        const isp = this.factories.get(token);
        if (!isp) return;
        if (!isp.fac) {
            this.factories.delete(token);
        } else {
            isp.useValue = null;
        }
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {(string | ProviderType)} [alias]
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    get<T>(token: Token<T>, ...providers: ProviderType[]): T {
        return this.toInstance(token, this.toPdrIfy(providers));
    }

    /**
     * get token instance in current injector or root container.
     * @param key token key.
     * @param providers providers.
     */
    getInstance<T>(key: Token<T>, ...providers: ProviderType[]): T {
        return this.toInstance(key, this.toPdrIfy(providers));
    }

    toInstance<T>(key: Token<T>, providers: IProvider): T {
        return getFacInstance(this, this.factories.get(key), providers) ?? this.strategy.getInstance(key, this, providers) ?? null;
    }
    /**
     * bind provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Type<T>} useClass
     * @param {Registered} [reged]  provider registered state.
     * @returns {this}
     * @memberof Injector
     */
    bindProvider<T>(provide: Token<T>, useClass: Type<T>, reged?: Registered): this {
        if (provide && useClass) {
            !reged && this.register(useClass);
            if (reged && reged.provides.indexOf(provide) < 0) {
                reged.provides.push(provide);
            }
            const fac = reged ? (pdr) => reged.injector.toInstance(useClass, pdr) : (pdr) => this.toInstance(useClass, pdr);
            this.factories.set(provide, { fac, useClass });
        }
        return this;
    }

    parseProvider(...providers: ProviderType[]): IProvider {
        return this.parsePdrIfy(providers);
    }

    toProvider(...providers: ProviderType[]): IProvider {
        return this.toPdrIfy(providers);
    }

    protected toPdrIfy(providers: ProviderType[]): IProvider {
        if (!providers || !providers.length) return null;
        return this.parsePdrIfy(providers);
    }

    protected parsePdrIfy(providers: ProviderType[], ifyNew?: (p: IProvider) => IProvider) {
        if (providers.length === 1 && isProvider(providers[0])) return providers[0];
        return ifyNew ? ifyNew(this.createProvider(providers)) : this.createProvider(providers);
    }

    protected createProvider(providers: ProviderType[]): IProvider {
        return createProvider(this).inject(...providers);
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
        return this.factories.get(token)?.useClass ?? (this.factories.has(token) && isClass(token) ? token : null) ?? this.strategy.getTokenProvider(token, this);
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof BaseInjector
     */
    unregister<T>(token: Token<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            this.factories.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp);
        }
        return this;
    }

    iterator(callbackfn: (fac: InstFac, key: Token, resolvor?: IProvider) => void | boolean, deep?: boolean): void | boolean {
        return this.strategy.iterator(this.factories, callbackfn, this, deep);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: IProvider, filter?: (key: Token) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as Provider, this, filter);
        return this;
    }

    clone(to?: IProvider): IProvider;
    clone(filter: (key: Token) => boolean, to?: IProvider): IProvider;
    clone(filter?: any, to?: IProvider): IProvider {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as Provider, filter);
        return to;
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = [];
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this._dsryCbs) {
            this._dsryCbs.push(callback);
        }
    }

    offDestory(callback: () => void) {
        remove(this._dsryCbs, callback);
    }

    protected createCustomFactory<T>(key: Token<T>, factory?: Factory<T>, singleton?: boolean) {
        return singleton ?
            (pdr) => {
                if (this.hasValue(key)) {
                    return this.getValue(key);
                }
                let instance = factory(pdr);
                this.setValue(key, instance);
                return instance;
            }
            : (pdr) => factory(pdr);
    }

    protected merge(from: Provider, to: Provider, filter?: (key: Token) => boolean) {
        from.factories.forEach((pdr, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, { ...pdr });
        });
    }

    protected destroying() {
        Array.from(this.factories.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.factories.clear();
        this.factories = null;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestory(this.destCb);
        } else if (this._container) {
            !this._container.destroyed && this._container.offDestory(this.destCb);
        }
        this.destCb = null;
        this._container = null;
        this.parent = null;
        this.strategy = null;
    }
}


/**
 * invoked param provider.
 */
export class InvokedProvider extends Provider {
    constructor(parent: IProvider) {
        super(parent);
    }
}



/**
 * is target provider or not.
 * @param target target
 */
export function isProvider(target: any): target is Provider {
    return target instanceof Provider;
}


/**
 * create new injector.
 * @param parent
 * @param strategy
 * @returns
 */
export function createProvider(parent: IProvider, strategy?: Strategy) {
    return new Provider(parent, strategy);
}

/**
 * create new invoked injector.
 * @param parent
 * @param strategy
 * @returns
 */
export function createInvokedProvider(parent: IProvider) {
    return new InvokedProvider(parent);
}


/**
 * injector default startegy.
 */
export const injectorStrategy = new DefaultStrategy(p => isInjector(p));

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector, strategy: Strategy = injectorStrategy) {
        super(parent, strategy);
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Injector
     */
    use(...modules: Modules[]): Type[] {
        let types = getTypes(...modules);
        types.forEach(ty => this.register(ty));
        return types;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        let option: ResolveOption<T>;
        if (isPlainObject(token)) {
            option = token as ResolveOption;
            if (option.providers) {
                option.providers.push(...providers);
            } else {
                option.providers = providers;
            }
        } else {
            option = { token, providers };
        }
        let destroy: Function;
        const inst = this.strategy.resolve(this, option, (pdrs) => {
            if (pdrs.length) {
                return this.parsePdrIfy(pdrs, p => {
                    destroy = () => p.destroy();
                    return p;
                });
            }
            return null;
        });
        destroy?.();
        cleanObj(option);
        return inst;
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance.
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers
     * @returns {TR}
     * @memberof Injector
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    abstract getLoader(): IModuleLoader;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    abstract load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    abstract getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     */
    abstract getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider;

    protected createProvider(providers: ProviderType[]): IProvider {
        return createProvider(this).inject({ provide: INJECTOR, useValue: this }, { provide: Injector, useValue: this }, ...providers);
    }
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return target instanceof Injector;
}

export function getFacInstance<T>(injector: IProvider, pd: InstFac<T>, provider: IProvider): T {
    if (!pd) return null;
    if (!isNil(pd.useValue)) return pd.useValue;
    if (pd.expires) {
        if (pd.expires > Date.now()) return pd.cache;
        pd.expires = null;
        pd.cache = null;
    }
    if (pd.useFactory) {
        let args = [];
        if (isArray(pd.deps) && pd.deps.length) {
            args = pd.deps.map(d => {
                if (isToken(d)) {
                    return injector.toInstance(d, provider);
                } else {
                    return d;
                }
            });
        }
        return pd.useFactory.apply(pd, args.concat(provider));
    }

    if (pd.useExisting) {
        return injector.toInstance(pd.useExisting, provider);
    }

    if (!pd.fac && !pd['_cked']) {
        if (pd.useClass) {
            if (!injector.state().isRegistered(pd.useClass)) {
                injector.register(pd as ClassRegister);
            } else {
                pd.fac = (pdr) => injector.toInstance(pd.useClass, pdr);
            }
        } else if (isClass(pd.provide)) {
            const Ctor = pd.provide;
            pd.fac = (pdr) => {
                let args = [];
                if (isArray(pd.deps) && pd.deps.length) {
                    args = pd.deps.map(d => {
                        if (isToken(d)) {
                            return injector.toInstance(d, pdr) ?? (isString(d) ? d : null);
                        } else {
                            return d;
                        }
                    });
                }
                return new Ctor(...args);
            };
        }
        pd['__cked'] = true;
    }
    return pd.fac?.(provider) ?? null;

}

// if (pr.provide) {
//     let provide = pr.provide;
//     if (isArray(pr.deps) && pr.deps.length) {
//         pr.deps.forEach(d => {
//             if (isClass(d)) this.regType(d);
//         });
//     }
//     if (!isNil(pr.useValue)) {
//         let val = pr.useValue;
//         this.setValue(provide, val);
//     } else if (isClass(pr.useClass)) {
//         this.regType(pr.useClass, pr);
//     } else if (isFunction(pr.useFactory)) {
//         let deps = pr.deps;
//         this.set(provide, (...pdrs: ProviderType[]) => {
//             let args = [];
//             if (isArray(deps) && deps.length) {
//                 args = deps.map(d => {
//                     if (isToken(d)) {
//                         return this.get(d, ...pdrs);
//                     } else {
//                         return d;
//                     }
//                 });
//             }
//             return pr.useFactory.apply(pr, args.concat(providers));
//         });
//     } else if (isToken(pr.useExisting)) {
//         this.set(provide, (...pdrs) => this.get(pr.useExisting, ...pdrs));
//     } else if (isClass(pr.provide)) {
//         let Ctor = pr.provide;
//         let deps = pr.deps;
//         this.set(provide, (...pdrs) => {
//             let args = [];
//             if (isArray(deps) && deps.length) {
//                 args = deps.map(d => {
//                     if (isToken(d)) {
//                         return this.get(d, ...pdrs) ?? (isString(d) ? d : null);
//                     } else {
//                         return d;
//                     }
//                 });
//             }
//             return new Ctor(...args);
//         });
//     }
// }