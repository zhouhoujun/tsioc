import { Type, Token, Modules, LoadType, InjectToken, IIocContainer, IInjector } from '@tsdi/ioc';
import { IContainerBuilder } from './IContainerBuilder';
import { IServiceResolver } from './IServiceResolver';
import { IServicesResolver } from './IServicesResolver';
import { IModuleLoader } from './services/ModuleLoader';

/**
 * IContainer token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const ContainerToken = new InjectToken<IContainer>('DI_IContainer');


/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer, IServiceResolver, IServicesResolver {

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
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(...modules: Modules[]): this;
    /**
     * use modules.
     *
     * @param {IInjector} injector
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(injector: IInjector, ...modules: Modules[]): this;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * load modules.
     *
     * @param {IInjector} injector
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    load(injector: IInjector, ...modules: LoadType[]): Promise<Type[]>;

}
