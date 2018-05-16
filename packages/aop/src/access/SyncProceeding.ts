import { IAdvisorProceeding, AdvisorProceedingToken } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { Express, Singleton } from '@ts-ioc/core';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/index';

@NonePointcut()
@Singleton(AdvisorProceedingToken, ReturningType.sync)
export class SyncProceeding implements IAdvisorProceeding {

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((action => {
            action(joinPoint);
        }))
    }
}
