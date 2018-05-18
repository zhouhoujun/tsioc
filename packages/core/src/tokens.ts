import { InjectToken } from './InjectToken';
import { IContainer, ContainerToken } from './IContainer';
import { LifeScope, LifeScopeToken } from './LifeScope';
import { IProviderMatcher, IRecognizer, ProviderMatcherToken, RecognizerToken } from './core/index';
import { IMethodAccessor, MethodAccessorToken } from './IMethodAccessor';
import { ICacheManager, CacheManagerToken } from './ICacheManager';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { AppConfiguration, AppConfigurationToken } from './IPlatform';


/**
 * ioc tokens.
 */
export interface IocTokens {

    /**
     * IContainer interface token.
     * it is a token id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
     */
    IContainer: InjectToken<IContainer>;

    /**
     * life scope interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    LifeScope: InjectToken<LifeScope>;

    /**
     * Providers match interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    IProviderMatcher: InjectToken<IProviderMatcher>;

    /**
     * IMethodAccessor interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    IMethodAccessor: InjectToken<IMethodAccessor>;

    /**
     * ICacheManager interface token.
     * it is a token id, you can register yourself ICacheManager for this.
     */
    ICacheManager: InjectToken<ICacheManager>;

    /**
     * ContainerBuilder interface token.
     * it is a token id, you can register yourself IContainerBuilder for this.
     */
    IContainerBuilder: InjectToken<IContainerBuilder>;

    /**
     * IRecognizer interface token.
     * it is a token id, you can register yourself IRecognizer for this.
     */
    IRecognizer: InjectToken<IRecognizer>;

    /**
     * AppConfiguration interface token.
     * it is a token id, you can register yourself AppConfiguration for this.
     */
    AppConfiguration: InjectToken<AppConfiguration>;
}


/**
 * tokens of ioc module.
 */
export const symbols: IocTokens = {

    /**
     * IContainer interface token.
     * it is a token id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
     */
    IContainer: ContainerToken,

    /**
     * life scope interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    LifeScope: LifeScopeToken,

    /**
     * Providers match interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    IProviderMatcher: ProviderMatcherToken,

    /**
     * IMethodAccessor interface token.
     * it is a token id, you can register yourself MethodAccessor for this.
     */
    IMethodAccessor: MethodAccessorToken,

    /**
     * ICacheManager interface token.
     * it is a token id, you can register yourself ICacheManager for this.
     */
    ICacheManager: CacheManagerToken,

    /**
     * ContainerBuilder interface token.
     * it is a token id, you can register yourself IContainerBuilder for this.
     */
    IContainerBuilder: ContainerBuilderToken,

    /**
     * IRecognizer interface token.
     * it is a token id, you can register yourself IRecognizer for this.
     */
    IRecognizer: RecognizerToken,

    /**
     * AppConfiguration interface token.
     * it is a token id, you can register yourself AppConfiguration for this.
     */
    AppConfiguration: AppConfigurationToken
}

/**
 * tokens of ioc module.
 */
export const IocTokens = symbols;
