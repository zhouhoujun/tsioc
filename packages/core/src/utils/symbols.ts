

/**
 * symbols of ioc module.
 */
export interface IocSymbols {

    /**
     * IContainer interface symbol.
     * it is a symbol id, you can use  @Inject, @Autowried or @Param to get container instance in yourself class.
     */
    IContainer: symbol;

    /**
     * life scope interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    LifeScope: symbol;

    /**
     * Providers match interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IProviderMatcher: symbol;

    /**
     * IMethodAccessor interface symbol.
     * it is a symbol id, you can register yourself MethodAccessor for this.
     */
    IMethodAccessor: symbol;

    /**
     * ICacheManager interface symbol.
     * it is a symbol id, you can register yourself ICacheManager for this.
     */
    ICacheManager: symbol;

    /**
     * ContainerBuilder interface symbol.
     * it is a symbol id, you can register yourself IContainerBuilder for this.
     */
    IContainerBuilder: symbol;

    /**
     * IRecognizer interface symbol.
     * it is a symbol id, you can register yourself IRecognizer for this.
     */
    IRecognizer: symbol;
}


/**
 * symbols of ioc module.
 */
export const symbols: IocSymbols = {

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
