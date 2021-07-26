import { LoadType, Type } from './types';
import {
    IInjector, IModuleLoader, IProvider, ProviderType, ResolveOption, ServicesOption, MethodType
} from './interface';
import { Token } from './tokens';
import { INJECTOR } from './metadata/tk';
import { Abstract } from './metadata/decor';
import { DefaultStrategy, Strategy } from './strategy';
import { createProvider, Provider } from './provider';


/**
 * injector default startegy.
 */
export const injectorStrategy = new DefaultStrategy(p => isInjector(p));

@Abstract()
export abstract class Injector extends Provider implements IInjector {

    constructor(readonly parent: IInjector, strategy: Strategy = injectorStrategy) {
        super(parent, strategy);
        const red = { value: this };
        this.factories.set(INJECTOR, red);
        this.factories.set(Injector, red);
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
    * @param {LoadType[]} modules load modules.
    * @returns {Promise<Type[]>}  types loaded.
    */
    abstract load(modules: LoadType[]): Promise<Type[]>;
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
     * @param {(Token<T> | ResolveOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        return this.resolve(target, providers);
    }

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
        return createProvider(this, [{ provide: INJECTOR, useValue: this }, { provide: Injector, useValue: this }, ...providers]);
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

