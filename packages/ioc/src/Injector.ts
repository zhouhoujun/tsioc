import { Token, InstanceFactory, Factory } from './types';
import { isFunction } from './utils/lang';
import { IInjector } from './IInjector';
import { IIocContainer, ContainerFactory } from './IIocContainer';
import { BaseInjector } from './BaseInjector';

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
        this.containerFac = isFunction(container) ? container : container.getFactory();
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.containerFac as ContainerFactory<T>;
    }

    getContainer(): IIocContainer {
        return this.containerFac();
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


