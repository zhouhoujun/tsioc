import { tokenId, TokenId } from '../tokens';
import { IMethodAccessor } from '../IMethodAccessor';
import { IInjector, InjectorProxy, IProvider } from '../IInjector';
import { IIocContainer } from '../IIocContainer';
import { ITypeReflects } from '../services/ITypeReflects';


/**
 * injector instance token of self.
 */
export const INJECTOR: TokenId<IInjector> = tokenId<IInjector>('DI_INJECTOR');
/**
 * the token of injector factory in current injector.
 */
export const InjectorProxyToken = tokenId<InjectorProxy>('DI_INJECTOR_PROXY');


/**
 *  injector provider token. create new injector provider.
 */
export const PROVIDERS = tokenId<IProvider>('DI_PROVIDERS');

/**
 *  injector token. create new injector.
 */
export const InjectorFactoryToken = tokenId<IInjector>('DI_INJECTOR_FACTORY');


/**
 * method accessor.
 */
export const MethodAccessorToken: TokenId<IMethodAccessor> = tokenId<IMethodAccessor>('DI_METHOD_ACCESSOR');

export const INVOKED_PROVIDERS = tokenId<IProvider>('INVOKED_PROVIDERS');


/**
 * type reflects token.
 */
export const TypeReflectsToken: TokenId<ITypeReflects> = tokenId<ITypeReflects>('IOC_TYPEREFLECTS');

/**
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject`, `@Autowried` or `@Param` to get container instance in yourself class.
 */
export const IocContainerToken: TokenId<IIocContainer> = tokenId<IIocContainer>('DI_IOCCONTAINER');
