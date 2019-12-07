import { Token, InstanceFactory, SymbolType, Factory, Type } from '../types';
import { isFunction, isObject } from '../utils/lang';
import { IIocContainer, ContainerFactory } from '../IIocContainer';
import { IInjector } from '../IInjector';
import { BaseInjector } from '../Injector';

// use core-js in browser.

/**
 * Provider Map.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class Providers
 */
export class Injector extends BaseInjector implements IInjector {

    private containerFac: ContainerFactory;

    constructor(container: IIocContainer | ContainerFactory) {
        super()
        this.setContainer(container);
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
        return Array.from(this.factories.keys());
    }

    values(): InstanceFactory[] {
        return Array.from(this.factories.values());
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
     * add token use value.
     *
     * @template T
     * @param {Token<T>} provide
     * @param {*} vaule
     * @returns {this}
     * @memberof ProviderMap
     */
    add<T>(provide: Token<T>, vaule: any): this {
        this.factories.set(this.getTokenKey(provide), () => vaule);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { Factory<T>} provider
     * @returns {this}
     * @memberof ProviderMap
     */
    register<T>(provide: Token<T>, provider?: Factory<T>): this {
        this.getContainer().registerFactory(this, provide, provider);
        return this;
        // let key = this.getTokenKey(provide);
        // if (isUndefined(key)) {
        //     return this;
        // }
        // let container = this.getContainer();
        // let factory;
        // if (isToken(provider) && container.has(provider)) {
        //     factory = (...providers: ProviderTypes[]) => {
        //         return container.resolve(provider, ...providers);
        //     };
        // } else {
        //     if (isFunction(provider)) {
        //         factory = provider;
        //     } else {
        //         factory = () => {
        //             return provider;
        //         };
        //     }
        // }
        // if (factory) {
        //     this.factories.set(key, factory);
        // }
    }

    clone(to?: Injector) {
        to = to || new Injector(this.getContainer());
        super.clone(to)
        return to;
    }

    // inject(...providers: InjectTypes[]): this {
    //     let container = this.getContainer();
    //     providers.forEach((p, index) => {
    //         if (isUndefined(p) || isNull(p)) {
    //             return;
    //         }
    //         if (isInjector(p)) {
    //             this.copy(p);
    //         } else if (p instanceof Provider) {
    //             if (p instanceof ParamProvider) {
    //                 this.factories.set(p.getToken(), (...providers: ParamProviders[]) => p.resolve(container, ...providers));
    //             } else {
    //                 this.factories.set(p.type, (...providers: ParamProviders[]) => p.resolve(container, ...providers));
    //             }
    //         } else if (isClass(p)) {
    //             if (!container.has(p)) {
    //                 container.register(p);
    //             }
    //             this.register(p, p);
    //         } else if (p instanceof ObjectMapProvider) {
    //             let pr = p.get();
    //             lang.forIn(pr, (val, name) => {
    //                 if (name && isString(name)) {
    //                     // object this can not resolve token. set all fileld as value factory.
    //                     this.add(name, val);
    //                 }
    //             });

    //         } else if (isBaseObject(p)) {
    //             let pr: any = p;
    //             if (isToken(pr.provide)) {
    //                 if (isArray(pr.deps) && pr.deps.length) {
    //                     pr.deps.forEach(d => {
    //                         if (isClass(d) && !container.has(d)) {
    //                             container.register(d);
    //                         }
    //                     });
    //                 }
    //                 if (isDefined(pr.useValue)) {
    //                     this.add(pr.provide, pr.useValue);
    //                 } else if (isClass(pr.useClass)) {
    //                     if (!container.has(pr.useClass)) {
    //                         container.register(pr.useClass);
    //                     }
    //                     this.factories.set(pr.provide, pr.useClass);
    //                 } else if (isFunction(pr.useFactory)) {
    //                     this.factories.set(pr.provide, (...providers: ProviderTypes[]) => {
    //                         let args = [];
    //                         if (isArray(pr.deps) && pr.deps.length) {
    //                             args = pr.deps.map(d => {
    //                                 if (isToken(d)) {
    //                                     return container.get(d, ...providers);
    //                                 } else {
    //                                     return d;
    //                                 }
    //                             });
    //                         }
    //                         return pr.useFactory.apply(pr, args.concat(providers));
    //                     });
    //                 } else if (isToken(pr.useExisting)) {
    //                     this.factories.set(pr.provide, (...providers: ProviderTypes[]) => container.get(pr.useExisting, ...providers));
    //                 }
    //             }
    //         }
    //     });

    //     return this;
    // }

}

export const ProviderMap = Injector;


