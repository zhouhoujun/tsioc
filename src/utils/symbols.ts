

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
 * Aop advice matcher interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const IAdviceMatcher = Symbol('IAdviceMatcher');

/**
 * Aop AspectManager interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const IAspectManager = Symbol('IAspectManager');
