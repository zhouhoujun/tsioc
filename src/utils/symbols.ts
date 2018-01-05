

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
 * IMethodAccessor interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const IMethodAccessor = Symbol('IMethodAccessor');

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
 * Aop AspectSet interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const IAspectSet = Symbol('IAspectSet');
