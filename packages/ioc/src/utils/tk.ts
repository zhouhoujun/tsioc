import { tokenId, TokenId } from '../tokens';
import { IMethodAccessor } from '../IMethodAccessor';
import { IInjector, IModuleLoader, InjectorProxy, IProvider } from '../IInjector';
import { IContainer, IServiceProvider } from '../IContainer';
import { ITypeReflects } from '../services/ITypeReflects';


/**
 * injector instance token of self.
 */
export const INJECTOR: TokenId<IInjector> = tokenId<IInjector>('DI_INJECTOR');

/**
 * the token of injector factory in current injector.
 * @deprecated will remove in next version
 */
export const InjectorProxyToken = tokenId<InjectorProxy>('DI_INJECTOR_PROXY');


/**
 *  injector provider token. create new injector provider.
 */
export const PROVIDERS = tokenId<IProvider>('DI_PROVIDERS');

/**
 *  injector token. create new injector.
 */
export const INJECTOR_FACTORY = tokenId<IInjector>('INJECTOR_FACTORY');
/**
 * @deprecated use `INJECTOR_FACTORY` instead.
 */
export const InjectorFactoryToken = INJECTOR_FACTORY;


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
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 * @deprecated use `CONTAINER` instead.
 */
export const IocContainerToken = CONTAINER;
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


/**
 * type reflects token.
 */
export const TypeReflectsToken: TokenId<ITypeReflects> = tokenId<ITypeReflects>('IOC_TYPEREFLECTS');
