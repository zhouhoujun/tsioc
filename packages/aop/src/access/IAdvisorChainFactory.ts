import { Joinpoint, JoinpointState } from '../joinpoints';
import { Advicer } from '../advices';
import { InjectToken } from '@ts-ioc/core';


/**
 * Aop IAdvisorChainFactory interface token.
 * it is a token id, you can register yourself IAdvisorChainFactory for this.
 */
export const AdvisorChainFactoryToken = new InjectToken<IAdvisorChainFactory>('DI_IAdvisorChainFactory');

/**
 * advice advisor chain factory for proxy method invoke.
 *
 * @export
 * @interface IAdvisorChainFactory
 */
export interface IAdvisorChainFactory {

    /**
     * get advices config.
     *
     * @param {string} adviceType
     * @returns {Advicer[]}
     * @memberof IAdvisorChainFactory
     */
    getAdvicers(adviceType: string): Advicer[];

    /**
     * invoke advives via state.
     *
     * @param {Joinpoint} joinPoint
     * @param {JoinpointState} state
     * @param {*} [valueOrthrowing]
     * @memberof IAdvisorChainFactory
     */
    invoaction(joinPoint: Joinpoint, state: JoinpointState, valueOrthrowing?: any): void;

    /**
     * invoke before advices.
     *
     * @param {Joinpoint} joinPoint
     * @memberof IAdvisorChainFactory
     */
    before(joinPoint: Joinpoint): void;

    /**
     * invoke pointcut advives.
     *
     * @param {Joinpoint} joinPoint
     * @memberof IAdvisorChainFactory
     */
    pointcut(joinPoint: Joinpoint): void;

    /**
     * invoke after advives.
     *
     * @param {Joinpoint} joinPoint
     * @memberof IAdvisorChainFactory
     */
    after(joinPoint: Joinpoint): void;

    /**
     * invoke throwing advives.
     *
     * @param {Joinpoint} joinPoint
     * @memberof IAdvisorChainFactory
     */
    afterThrowing(joinPoint: Joinpoint): void;

    /**
     * invoke returning advives.
     *
     * @param {Joinpoint} joinPoint
     * @memberof IAdvisorChainFactory
     */
    afterReturning(joinPoint: Joinpoint): void;
}
