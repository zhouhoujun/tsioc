import { Token, InstanceFactory, SymbolType, Factory, Type } from '../types';
import { isFunction, isUndefined, isObject, isNull, isClass, lang, isString, isBaseObject, isArray, isDefined } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { IIocContainer, ContainerFactory } from '../IIocContainer';
import { IResolver, IResolverContainer } from '../IResolver';
import { ProviderTypes, ParamProviders } from './types';
import { IocCoreService } from '../IocCoreService';
import { Provider, ParamProvider, ObjectMapProvider } from './Provider';

// use core-js in browser.

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class Injector extends IocCoreService implements IResolverContainer {

    private containerFac: ContainerFactory;

    protected map: Map<Token, InstanceFactory>;
    constructor(container: IIocContainer | ContainerFactory) {
        super()
        this.setContainer(container);
        this.map = new Map();
    }

    get size(): number {
        return this.map.size;
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.containerFac as ContainerFactory<T>;
    }

    getContainer(): IIocContainer {
        return this.containerFac();
    }

    hasContainer(): boolean {
        return isFunction(this.containerFac);
    }

    setContainer(container: IIocContainer | ContainerFactory) {
        if (!container) {
            return;
        }
        this.containerFac = isFunction(container) ? container : container.getFactory();
    }

    keys(): Token[] {
        return Array.from(this.map.keys());
    }

    values(): InstanceFactory[] {
        return Array.from(this.map.values());
    }

    /**
     * has provide or not.
     *
     * @param {Token} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    has(provide: Token): boolean {
        return this.map.has(this.getTokenKey(provide));
    }

    provides(): Token[] {
        return this.keys()
    }

    /**
     * get token key.
     *
     * @param {Token} token
     * @returns {SymbolType)}
     * @memberof ProviderMap
     */
    getTokenKey(token: Token): SymbolType {
        return this.getContainer().getTokenKey(token);
    }

    /**
     * get token factory.
     *
     * @template T
     * @param {Token<T>} provide
     * @returns {InstanceFactory<T>}
     * @memberof ProviderMap
     */
    get<T>(provide: Token<T>): InstanceFactory<T> {
        return this.map.get(this.getTokenKey(provide));
    }

    /**
     * get token provider.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof ProviderMap
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.getContainer().getTokenProvider(token);
    }

    /**
     * unregister.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof ProviderMap
     */
    unregister<T>(token: Token<T>): this {
        let key = this.getTokenKey(token);
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        return this;
    }

    /**
     * add and bind token provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    add<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        this.map.set(this.getTokenKey(provide), () => provider);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {(Token<T> | Factory<T>)} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    register<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        let key = this.getTokenKey(provide);
        if (isUndefined(key)) {
            return this;
        }
        let factory;
        if (isToken(provider) && this.getContainer().has(provider)) {
            factory = (...providers: ProviderTypes[]) => {
                return this.getContainer().resolve(provider, ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = provider;
            } else {
                factory = () => {
                    return provider;
                };
            }
        }
        if (factory) {
            this.map.set(key, factory);
        }
        return this;
    }

    /**
     * resolve instance via provide token.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ProviderMap
     */
    resolve<T>(provide: Token<T>, ...providers: ProviderTypes[]): T {
        let key = this.getTokenKey(provide);
        if (this.has(key)) {
            let provider = this.get(key);
            return isFunction(provider) ? provider(...providers) : null;
        }
        return null;
    }

    iterator(callbackfn: (fac: InstanceFactory, tk: Token, resolvor?: IResolver) => void | boolean): void | boolean {
        return !this.keys().some(tk => {
            if (isToken(tk)) {
                return callbackfn(this.get(tk), tk, this) === false;
            }
            return false;
        });
    }

    /**
     * copy provider map.
     *
     * @param {Injector} map
     * @returns
     * @memberof ProviderMap
     */
    copy(map: Injector): this {
        if (!map) {
            return this;
        }
        map.iterator((fac, key) => {
            this.map.set(key, fac);
        });
        return this;
    }

    clone() {
        let newpdr = new Injector(this.getContainer());
        this.map.forEach((fac, key) => {
            newpdr.map.set(key, fac);
        });
        return newpdr;
    }

    parse(...providers: ProviderTypes[]): this {
        let container = this.getContainer();
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isInjector(p)) {
                this.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    this.register(p.getToken(), (...providers: ParamProviders[]) => p.resolve(container, ...providers));
                } else {
                    this.register(p.type, (...providers: ParamProviders[]) => p.resolve(container, ...providers));
                }
            } else if (isClass(p)) {
                if (!container.has(p)) {
                    container.register(p);
                }
                this.register(p, p);
            } else if (p instanceof ObjectMapProvider) {
                let pr = p.get();
                lang.forIn(pr, (val, name) => {
                    if (name && isString(name)) {
                        // object this can not resolve token. set all fileld as value factory.
                        this.register(name, () => val);
                    }
                });

            } else if (isBaseObject(p)) {
                let pr: any = p;
                if (isToken(pr.provide)) {
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d) && !container.has(d)) {
                                container.register(d);
                            }
                        });
                    }
                    if (isDefined(pr.useValue)) {
                        this.register(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        this.register(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        this.register(pr.provide, (...providers: ProviderTypes[]) => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isToken(d)) {
                                        return container.resolve(d, ...providers);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args.concat(providers));
                        });
                    } else if (isToken(pr.useExisting)) {
                        this.register(pr.provide, (...providers: ProviderTypes[]) => container.resolve(pr.useExisting, ...providers));
                    }
                }
            }
        });

        return this;
    }
}

export const ProviderMap = Injector;

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: object): target is Injector {
    if (!isObject(target)) {
        return false;
    }
    return target instanceof Injector;
}

export const isProvoderMap = isInjector;
