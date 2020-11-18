import { ClassType, Type } from './types';
import { Token, FactoryLike, ProviderType } from './tokens';
import { IInjector, IProvider } from './IInjector';
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
export interface IIocContainer extends IInjector {

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
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register type class.
     * @param {IProvider} injector
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IProvider, Type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    /**
     * register factory to injector.
     * @param injector the injector to register.
     * @param token register token
     * @param fac factory of token.
     * @param singleton singlteon or not.
     */
    registerFactory<T>(injector: IProvider, token: Token<T>, fac?: FactoryLike<T>, singleton?: boolean): this;
}
