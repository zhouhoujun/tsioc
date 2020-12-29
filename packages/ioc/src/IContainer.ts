import { ClassType, Type } from './types';
import { Token, FactoryLike, ProviderType } from './tokens';
import { IInjector, IProvider, ServiceOption, ServicesOption } from './IInjector';
import { IActionProvider } from './actions/act';
import { Registered } from './decor/type';



/**
 * registered state.
 */
export interface RegisteredState {
    /**
     * get type registered info.
     * @param type
     */
    getRegistered<T extends Registered>(type: ClassType): T;
    /**
     * get injector the type registered in.
     * @param type
     */
    getInjector<T extends IInjector = IInjector>(type: ClassType): T;
    /**
     * check the type registered or not.
     * @param type
     */
    isRegistered(type: ClassType): boolean;

    /**
     * register type.
     * @param type class type
     * @param data registered data.
     */
    regType<T extends Registered>(type: ClassType, data: T);

    /**
     * delete registered.
     * @param type
     */
    deleteType(type: ClassType);

    /**
     * has decorator provider or not.
     * @param decor
     */
    hasProvider(decor: string): boolean;
    /**
     * get decorator provider.
     * @param decor
     */
    getProvider(decor: string);

    /**
     * register decorator.
     * @param decor
     * @param providers
     */
    regDecoator(decor: string, ...providers: ProviderType[]);
}


/**
 * root container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IContainer extends IInjector {

    readonly id: string;

    /**
     * registered state.
     */
    readonly regedState: RegisteredState;
    /**
     * action provider.
     */
    readonly provider: IActionProvider;
    /**
     * get root contianer.
     */
    getContainer(): this;
    /**
     * create injector.
     */
    createInjector(): IInjector;
    /**
     * register type class.
     * @param {IProvider} injector
     * @param Type the class.
     * @param [options] the class prodvider to.
     */
    registerIn<T>(injector: IProvider, Type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register factory to injector.
     * @param injector the injector to register.
     * @param token register token
     * @param fac factory of token.
     * @param singleton singlteon or not.
     */
    registerFactory<T>(injector: IProvider, token: Token<T>, fac?: FactoryLike<T>, singleton?: boolean): this;
}

export type IIocContainer = IContainer;

/**
 * service provider.
 */
export interface IServiceProvider {
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider;
}
