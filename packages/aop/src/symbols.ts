/**
 * symboles of aop.
 */
export interface AopSymbols {
    /**
     * Aop proxy method interface symbol.
     * it is a symbol id, you can register yourself IProxyMethod for this.
     */
    IProxyMethod: symbol;

    /**
     * Aop advice matcher interface symbol.
     * it is a symbol id, you can register yourself IActionBuilder for this.
     */
    IAdviceMatcher: symbol;

    /**
     * Aop IAdvisor interface symbol.
     * it is a symbol id, you can register yourself IAdvisor for this.
     */
    IAdvisor: symbol;

    /**
     * Aop IAdvisorChainFactory interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChainFactory for this.
     */
    IAdvisorChainFactory: symbol;

    /**
     * Aop IAdvisorChain interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChain for this.
     */
    IAdvisorChain: symbol;

    /**
     * Aop IAdvisorProceeding interface symbol.
     * it is a symbol id, you can register yourself IAdvisorProceeding for this.
     */
    IAdvisorProceeding: symbol;

    /**
     * joinpoint symbol.
     */
    IJoinpoint: symbol;

}


/**
 * symboles of aop.
 */
export const AopSymbols: AopSymbols = {
    /**
     * Aop proxy method interface symbol.
     * it is a symbol id, you can register yourself IProxyMethod for this.
     */
    IProxyMethod: Symbol('IProxyMethod'),

    /**
     * Aop advice matcher interface symbol.
     * it is a symbol id, you can register yourself IActionBuilder for this.
     */
    IAdviceMatcher: Symbol('IAdviceMatcher'),

    /**
     * Aop IAdvisor interface symbol.
     * it is a symbol id, you can register yourself IAdvisor for this.
     */
    IAdvisor: Symbol('IAdvisor'),

    /**
     * Aop IAdvisorChainFactory interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChainFactory for this.
     */
    IAdvisorChainFactory: Symbol('IAdvisorChainFactory'),

    /**
     * Aop IAdvisorChain interface symbol.
     * it is a symbol id, you can register yourself IAdvisorChain for this.
     */
    IAdvisorChain: Symbol('IAdvisorChain'),

    /**
     * Aop IAdvisorProceeding interface symbol.
     * it is a symbol id, you can register yourself IAdvisorProceeding for this.
     */
    IAdvisorProceeding: Symbol('IAdvisorProceeding'),

    /**
     * joinpoint symbol.
     */
    IJoinpoint: Symbol('IJoinpoint')

}
