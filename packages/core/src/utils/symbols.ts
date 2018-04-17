/**
 * symbols of ioc module.
 */
export const symbols = {

    /**
     * IContainer interface symbol.
     * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
     */
    IContainer: Symbol('IContainer'),

    /**
     * life scope interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    LifeScope: Symbol('LifeScope'),

    /**
     * Providers match interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IProviderMatcher: Symbol('IProviderMatcher'),

    /**
     * IMethodAccessor interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IMethodAccessor: Symbol('IMethodAccessor'),

    /**
     * ICacheManager interface symbol.
     * it is a symbol id, you can register yourself ICacheManager for this.
     */
    ICacheManager: Symbol('ICacheManager'),

    /**
     * ContainerBuilder interface symbol.
     * it is a symbol id, you can register yourself IContainerBuilder for this.
     */
    IContainerBuilder: Symbol('IContainerBuilder'),

    /**
     * IRecognizer interface symbol.
     * it is a symbol id, you can register yourself IRecognizer for this.
     */
    IRecognizer: Symbol('IRecognizer')
}
