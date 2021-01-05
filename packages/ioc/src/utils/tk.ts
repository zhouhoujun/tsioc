import { tokenId, TokenId } from '../tokens';
import { IMethodAccessor } from '../IMethodAccessor';
import { IInjector, IModuleLoader, IProvider, Strategy } from '../IInjector';
import { IContainer, IServiceProvider } from '../IContainer';


/**
 * injector instance token of self.
 */
export const INJECTOR: TokenId<IInjector> = tokenId<IInjector>('DI_INJECTOR');

/**
 * injector instance token of self.
 */
export const PARENT_INJECTOR: TokenId<IInjector> = tokenId<IInjector>('PARENT_INJECTOR');

/**
 * strategy.
 */
export const STRATEGY = tokenId<Strategy>('DI_STRATEGY');

/**
 *  injector provider token. create new injector provider.
 */
export const PROVIDERS = tokenId<IProvider>('DI_PROVIDERS');

/**
 *  injector token. create new injector.
 */
export const INJECTOR_FACTORY = tokenId<IInjector>('INJECTOR_FACTORY');

/**
 * method accessor token.
 */
export const METHOD_ACCESSOR: TokenId<IMethodAccessor> = tokenId<IMethodAccessor>('METHOD_ACCESSOR');

/**
 * method accessor token.
 * @deprecated use `METHOD_ACCESSOR` instead.
 */
export const MethodAccessorToken = METHOD_ACCESSOR;

/**
 * invoked providers token.
 */
export const INVOKED_PROVIDERS = tokenId<IProvider>('INVOKED_PROVIDERS');

/**
 * root container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const CONTAINER: TokenId<IContainer> = tokenId<IContainer>('IOC_CONTAINER');
/**
 * root container token.
 *
 * @deprecated use `CONTAINER` instead.
 */
export const ContainerToken = CONTAINER;
/**
 * root ioc container token.
 * @deprecated use `CONTAINER` instead.
 */
export const IOC_CONTAINER = CONTAINER;

/**
 * module loader.
 */
export const MODULE_LOADER = tokenId<IModuleLoader>('MODULE_LOADER');

/**
 * service provider.
 */
export const SERVICE_PROVIDER = tokenId<IServiceProvider>('SERVICE_PROVIDER');

