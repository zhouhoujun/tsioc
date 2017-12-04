

/**
 * IContainer interface symbol.
 * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
 */
export const IContainer = Symbol('IContainer');

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
 * ActionBuilder interface symbol.
 * it is a symbol id, you can register yourself IActionBuilder for this.
 */
export const IActionBuilder = Symbol('IActionBuilder');

export const MethodDecoratorMap = Symbol('Autofac-MethodDecoratorMap');


export const PropertyDecoratorMap = Symbol('Autofac-PropertyDecoratorMap');

export const ParameterDecoratorMap = Symbol('Autofac-ParameterDecoratorMap');

export const ClassDecoratorMap = Symbol('Autofac-ClassDecoratorMap');
