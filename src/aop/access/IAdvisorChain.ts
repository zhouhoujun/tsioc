import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { Express } from '../../types';
import { IRecognizer } from '../../core/index';

export interface IAdvisorChain {
    next(action: Express<Joinpoint, any>);
    getRecognizer(): IRecognizer;
    process(): void;
}
