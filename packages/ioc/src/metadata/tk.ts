import { Token, tokenId } from '../tokens';
import { Invoker } from '../Invoker';
import { IInjector, IModuleLoader } from '../IInjector';
import { IContainer } from '../IContainer';

/**
 * injector instance token of self.
 */
export const INJECTOR: Token<IInjector> = tokenId<IInjector>('DI_INJECTOR');

/**
 * appliction root module injector token.
 */
export const ROOT_INJECTOR: Token<IInjector> = tokenId<IInjector>('ROOT_INJECTOR');

/**
 * method invoker token.
 */
export const INVOKER: Token<Invoker> = tokenId<Invoker>('INVOKER');
/**
 * method invoker token.
 * @deprecated use `INVOKER` instead.
 */
export const MethodAccessorToken = INVOKER;
/**
 * root container token.
 * it is a symbol id, you can use  `@Inject()`, `@AutoWired()` or `@Param()` to get container instance in yourself class.
 */
export const CONTAINER: Token<IContainer> = tokenId<IContainer>('IOC_CONTAINER');
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
 * resolve target token.
 */
export const TARGET = tokenId<any>('TARGET');