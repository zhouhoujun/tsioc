import { Joinpoint } from '../joinpoints';
import { Express, InjectToken } from '@ts-ioc/ioc';


/**
 * Aop IAdvisorProceeding interface token.
 * it is a token id, you can register yourself IAdvisorProceeding for this.
 */
export const AdvisorProceedingToken = new InjectToken<IAdvisorProceeding>('DI_IAdvisorProceeding');

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
