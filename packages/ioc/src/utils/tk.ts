import { tokenId, TokenId } from '../tokens';
import { IMethodAccessor } from '../IMethodAccessor';
import { IInjector, IProvider } from '../IInjector';
import { IIocContainer } from '../IIocContainer';


/**
 * injector instance token of self.
 */
export const INJECTOR: TokenId<IInjector> = tokenId<IInjector>('DI_INJECTOR');
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
 * invoked providers token.
 */
export const INVOKED_PROVIDERS = tokenId<IProvider>('INVOKED_PROVIDERS');

/**
 * root ioc container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const IOC_CONTAINER: TokenId<IIocContainer> = tokenId<IIocContainer>('IOC_CONTAINER');

