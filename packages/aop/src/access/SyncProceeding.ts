import { IAdvisorProceeding, AdvisorProceedingToken } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints';
import { Express, Singleton } from '@ts-ioc/ioc';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/NonePointcut';

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
