import { Joinpoint } from '../joinpoints/index';
import { Express } from '../../types';

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
