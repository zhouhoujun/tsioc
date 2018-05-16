import { ProxyMethodToken, AdvisorChainFactoryToken, AdvisorProceedingToken, AdvisorChainToken, IProxyMethod, IAdvisorChainFactory, IAdvisorChain, IAdvisorProceeding } from './access/index';
import { AdviceMatcherToken, IAdviceMatcher } from './IAdviceMatcher';
import { AdvisorToken, IAdvisor } from './IAdvisor';
import { InjectToken } from '@ts-ioc/core';
import { IJoinpoint, JoinpointToken } from './joinpoints/index';

export interface AopTokens {
    /**
     * Aop proxy method interface token.
     * it is a token id, you can register yourself IProxyMethod for this.
     */
    IProxyMethod: InjectToken<IProxyMethod>,

    /**
     * Aop advice matcher interface token.
     * it is a token id, you can register yourself IActionBuilder for this.
     */
    IAdviceMatcher: InjectToken<IAdviceMatcher>,

    /**
     * Aop IAdvisor interface token.
     * it is a token id, you can register yourself IAdvisor for this.
     */
    IAdvisor: InjectToken<IAdvisor>,

    /**
     * Aop IAdvisorChainFactory interface token.
     * it is a token id, you can register yourself IAdvisorChainFactory for this.
     */
    IAdvisorChainFactory: InjectToken<IAdvisorChainFactory>,

    /**
     * Aop IAdvisorChain interface token.
     * it is a token id, you can register yourself IAdvisorChain for this.
     */
    IAdvisorChain: InjectToken<IAdvisorChain>,

    /**
     * Aop IAdvisorProceeding interface token.
     * it is a token id, you can register yourself IAdvisorProceeding for this.
     */
    IAdvisorProceeding: InjectToken<IAdvisorProceeding>,

    /**
     * Aop IJoinpoint interface token.
     * it is a token id, you can register yourself IJoinpoint for this.
     */
    IJoinpoint: InjectToken<IJoinpoint>,
}

/**
 * tokens of aop.
 */
export const AopTokens: AopTokens = {
    /**
     * Aop proxy method interface token.
     * it is a token id, you can register yourself IProxyMethod for this.
     */
    IProxyMethod: ProxyMethodToken,

    /**
     * Aop advice matcher interface token.
     * it is a token id, you can register yourself IActionBuilder for this.
     */
    IAdviceMatcher: AdviceMatcherToken,

    /**
     * Aop IAdvisor interface token.
     * it is a token id, you can register yourself IAdvisor for this.
     */
    IAdvisor: AdvisorToken,

    /**
     * Aop IAdvisorChainFactory interface token.
     * it is a token id, you can register yourself IAdvisorChainFactory for this.
     */
    IAdvisorChainFactory: AdvisorChainFactoryToken,

    /**
     * Aop IAdvisorChain interface token.
     * it is a token id, you can register yourself IAdvisorChain for this.
     */
    IAdvisorChain: AdvisorChainToken,

    /**
     * Aop IAdvisorProceeding interface token.
     * it is a token id, you can register yourself IAdvisorProceeding for this.
     */
    IAdvisorProceeding: AdvisorProceedingToken,

    /**
     * Aop IJoinpoint interface token.
     * it is a token id, you can register yourself IJoinpoint for this.
     */
    IJoinpoint: JoinpointToken

}

/**
 * tokens of aop.
 */
export const AopSymbols = AopTokens;
