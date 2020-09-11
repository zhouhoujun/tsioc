import { Type } from '../types';
import { Token, tokenId, TokenId } from '../tokens';
import { IMethodAccessor, IParameter } from '../IMethodAccessor';
import { ITypeReflect } from '../services/ITypeReflect';
import { IInjector, InjectorProxy, IProvider } from '../IInjector';
import { ActCtxOption } from '../actions/Action';
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



export const CTX_PROVIDERS: TokenId<IProvider> = tokenId<IProvider>('DI_PROVIDERS');
export const CTX_OPTIONS = tokenId<ActCtxOption>('CTX_OPTIONS');
export const CTX_PARAMS = tokenId<IParameter[]>('CTX_PARAMS');
export const CTX_ARGS = tokenId<any[]>('CTX_ARGS');

export const CTX_CURR_DECOR = tokenId<string>('CTX_CURR_DECOR');
export const CTX_CURR_DECOR_SCOPE = tokenId<any>('CTX_CURR_DECOR_SCOPE');
export const CTX_TYPE_REGIN = tokenId<string>('CTX_TYPE_REGIN');

export const CTX_TARGET_TOKEN = tokenId<Token>('CTX_TARGET_TOKEN');
export const CTX_TARGET_RELF = tokenId<ITypeReflect>('CTX_TARGET_RELF');

export const CTX_TOKEN = tokenId<Token>('CTX_TOKEN');
export const CTX_TYPE = tokenId<Type>('CTX_TYPE');
export const CTX_DEFAULT_TOKEN = tokenId<Token>('CTX_DEFAULT_TOKEN');
export const CTX_PROPERTYKEY = tokenId<string>('CTX_PROPERTYKEY');
export const CTX_SINGLETON = tokenId<boolean>('CTX_SINGLETON');
