import { Express, Singleton } from '@tsdi/ioc';
import { ReturningType } from './ReturningType';
import { AdvisorProceeding } from './AdvisorProceeding';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { NonePointcut } from '../decorators/NonePointcut';

@NonePointcut()
@Singleton(AdvisorProceeding, ReturningType.sync)
export class SyncProceeding extends AdvisorProceeding {

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((action => {
            action(joinPoint);
        }))
    }
}
