

/**
 * IContainer interface symbol.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
export const IContainer = Symbol('IContainer');

/**
 * life scope interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const LifeScope = Symbol('LifeScope');

/**
 * Providers match interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const IProviderMatcher = Symbol('IProviderMatcher');

/**
 * IMethodAccessor interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const IMethodAccessor = Symbol('IMethodAccessor');

/**
 * ICacheManager interface symbol.
 * it is a symbol id, you can register yourself ICacheManager for this.
 */
export const ICacheManager = Symbol('ICacheManager');

/**
 * ContainerBuilder interface symbol.
 * it is a symbol id, you can register yourself IContainerBuilder for this.
 */
export const IContainerBuilder = Symbol('IContainerBuilder');

/**
 * IRecognizer interface symbol.
 * it is a symbol id, you can register yourself IRecognizer for this.
 */
export const IRecognizer = Symbol('IRecognizer');

/**
 * Aop proxy method interface symbol.
 * it is a symbol id, you can register yourself IProxyMethod for this.
 */
export const IProxyMethod = Symbol('IProxyMethod');

/**
 * Aop advice matcher interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const IAdviceMatcher = Symbol('IAdviceMatcher');

/**
 * Aop IAdvisor interface symbol.
 * it is a symbol id, you can register yourself IAdvisor for this.
 */
export const IAdvisor = Symbol('IAdvisor');

/**
 * Aop IAdvisorChainFactory interface symbol.
 * it is a symbol id, you can register yourself IAdvisorChainFactory for this.
 */
export const IAdvisorChainFactory = Symbol('IAdvisorChainFactory');

/**
 * Aop IAdvisorChain interface symbol.
 * it is a symbol id, you can register yourself IAdvisorChain for this.
 */
export const IAdvisorChain = Symbol('IAdvisorChain');

/**
 * Aop IAdvisorProceeding interface symbol.
 * it is a symbol id, you can register yourself IAdvisorProceeding for this.
 */
export const IAdvisorProceeding = Symbol('IAdvisorProceeding');

/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const LogConfigure = Symbol('LogConfigure');
