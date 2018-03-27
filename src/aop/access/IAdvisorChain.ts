import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { Express } from '../../types';

export interface IAdvisorChain {
    next(action: Express<Joinpoint, any>);
    process(): void;
}
