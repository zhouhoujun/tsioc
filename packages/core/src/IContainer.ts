import {
    Type, Token, Modules, LoadType,
    InjectToken, IIocContainer
} from '@tsdi/ioc';
import { IContainerBuilder } from './IContainerBuilder';
import { IServiceResolver } from './IServiceResolver';
import { IServicesResolver } from './IServicesResolver';
import { IModuleLoader } from './services';
import { ResovleActionContext } from './resolves';

/**
 * IContainer token.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
export const ContainerToken = new InjectToken<IContainer>('DI_IContainer');


/**
 * resolver execute.
 *
 * @export
 * @interface IResolverExecute
 */
export interface IContextResolver {

    /**
     * resolve in context.
     *
     * @template T
     * @param {T} ctx
     * @returns {T}
     * @memberof IResolverExecute
     */
    resolveContext<T extends ResovleActionContext>(ctx: T): T;
}

/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer, IContextResolver, IServiceResolver, IServicesResolver {

    /**
     * get container builder of this container.
     *
     * @returns {IContainerBuilder}
     * @memberof IContainer
     */
    getBuilder(): IContainerBuilder;

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader;


    /**
     * get token implements.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof IContainer
     */
    getTokenImpl<T>(token: Token<T>): Type<T>;

    /**
     * current container has register.
     *
     * @template T
     * @param {Token<T>} key
     * @returns {boolean}
     * @memberof IContainer
     */
    hasRegister<T>(key: Token<T>): boolean;

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
