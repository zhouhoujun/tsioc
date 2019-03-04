import {
    Type, Token, Factory, SymbolType, Modules,
    LoadType, ReferenceToken, RefTokenFac, RefTarget, ClassType, InstanceFactory
} from './types';
import { IContainerBuilder } from './IContainerBuilder';
import { IResolver, IResolverContainer } from './IResolver';
import { ResolverChain } from './resolves';
import { InjectToken, IIocContainer, ParamProviders } from '@ts-ioc/ioc';

/**
 * IContainer token.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
export const ContainerToken = new InjectToken<IContainer>('DI_IContainer');

/**
 * resove way
 *
 * @export
 * @enum {number}
 */
export enum ResoveWay {
    /**
     * current container.
     */
    current = 1,
    /**
     * traverse all curr node children.
     */
    traverse = 1 << 1,
    /**
     * bubble up all parent.
     */
    bubble = 1 << 2,
    /**
     * current and children.
     */
    nodes = current | traverse,
    /**
     * current and bubble.
     */
    routeup = current | bubble,
    /**
     *  traverse of curr node, children.
     */
    all = current | traverse | bubble
}

/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer {

    /**
     * get container builder of this container.
     *
     * @returns {IContainerBuilder}
     * @memberof IContainer
     */
    getBuilder(): IContainerBuilder;




    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {RefTokenFac<T>} toRefToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], toRefToken: RefTokenFac<T>, ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {(boolean | Token<T>)} defaultToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], defaultToken: boolean | Token<T>, ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {RefTokenFac<T>} toRefToken
     * @param {(boolean | Token<T>)} defaultToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], toRefToken: RefTokenFac<T>, defaultToken: boolean | Token<T>, ...providers: ParamProviders[]): T;

    /**
     * get target reference service.
     *
     * @template T
     * @param {ReferenceToken<T>} [refToken] reference service Registration Injector
     * @param {(RefTarget | RefTarget[])} target  the service reference to.
     * @param {Token<T>} [defaultToken] default service token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getServices<T>(type: ClassType<T> | ((token: ClassType<T>) => boolean), ...providers: ParamProviders[]): T[];

    /**
    * get all private services of target extends class `type`.
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], ...providers: ParamProviders[]): T[];

    /**
    * get all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {boolean} both if true, will get all server and target private service of class extends `type` .
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], both: boolean, ...providers: ParamProviders[]): T[];

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(...modules: Modules[]): this;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules: LoadType[]): Promise<Type<any>[]>;

}
