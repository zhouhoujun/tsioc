import { tokenId, TokenId } from '../tokens';
import { IMethodAccessor } from '../IMethodAccessor';
import { IInjector, InjectorProxy, IProvider, Registered } from '../IInjector';
import { IIocContainer } from '../IIocContainer';
import { ClassType } from '../types';


/**
 * injector instance token of self.
 */
export const INJECTOR: TokenId<IInjector> = tokenId<IInjector>('DI_INJECTOR');
/**
 * the token use to get delegate of current injector.
 */
export const INJECTOR_DL = tokenId<InjectorProxy>('INJECTOR_DELEG');
/**
 * the token use to get delegate of current injector.
 * @deprecated use `INJECTOR_DL` instead.
 */
export const InjectorProxyToken = INJECTOR_DL;

export const REGISTERED = tokenId<Map<ClassType, Registered>>('DI_REGISTERED');
/**
 *  injector provider token. create new injector provider.
 */
export const PROVIDERS = tokenId<IProvider>('DI_PROVIDERS');

/**
 *  injector token. create new injector.
 */
export const INJECTOR_FACTORY = tokenId<IInjector>('INJECTOR_FACTORY');
/**
 *  injector token. create new injector.
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
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const IOC_CONTAINER: TokenId<IIocContainer> = tokenId<IIocContainer>('IOC_CONTAINER');
/**
 * root ioc container token.
 * @deprecated use `IOC_CONTAINER` instead.
 */
export const IocContainerToken = IOC_CONTAINER;
