import { Joinpoint } from '../joinpoints/index';
import { Express, InjectToken } from '@ts-ioc/core';


/**
 * Aop IAdvisorProceeding interface token.
 * it is a token id, you can register yourself IAdvisorProceeding for this.
 */
export const AdvisorProceedingToken = new InjectToken<IAdvisorProceeding>('__IOC_IAdvisorProceeding');

/**
 * advisor proceeding.
 *
 * @export
 * @interface IAdvisorProceeding
 */
export interface IAdvisorProceeding {
    /**
     * process.
     *
     * @param {Joinpoint} joinPoint
     * @param {...Express<Joinpoint, any>[]} actions
     * @memberof IAdvisorProceeding
     */
    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[])
}
