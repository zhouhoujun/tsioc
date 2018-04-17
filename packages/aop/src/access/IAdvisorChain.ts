import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { Express, IRecognizer } from '@ts-ioc/core';

/**
 * advisor chain.
 *
 * @export
 * @interface IAdvisorChain
 */
export interface IAdvisorChain {
    /**
     * register next step of chain.
     *
     * @param {Express<Joinpoint, any>} action
     * @memberof IAdvisorChain
     */
    next(action: Express<Joinpoint, any>);
    /**
     * get Recognizer of the chain, to recognize the vaule is special alias for registor to container.
     *
     * @returns {IRecognizer}
     * @memberof IAdvisorChain
     */
    getRecognizer(): IRecognizer;
    /**
     * run chain process.
     *
     * @memberof IAdvisorChain
     */
    process(): void;
}
