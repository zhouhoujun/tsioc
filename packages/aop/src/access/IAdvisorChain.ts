import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { Express, IRecognizer } from '@tsioc/core';

export interface IAdvisorChain {
    next(action: Express<Joinpoint, any>);
    getRecognizer(): IRecognizer;
    process(): void;
}
