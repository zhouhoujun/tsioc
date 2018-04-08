import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { Express, Singleton, symbols } from '@tsioc/core';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/index';

@NonePointcut()
@Singleton(symbols.IAdvisorProceeding, ReturningType.sync)
export class SyncProceeding implements IAdvisorProceeding {

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((action => {
            action(joinPoint);
        }))
    }
}
