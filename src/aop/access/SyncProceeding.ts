import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { Express } from '../../types';
import { Singleton, NonePointcut } from '../../core/index';
import { symbols } from '../../utils/index';
import { ReturningType } from './ReturningType';

@NonePointcut()
@Singleton(symbols.IAdvisorProceeding, ReturningType.sync)
export class SyncProceeding implements IAdvisorProceeding {

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        console.log('sync Proceeding...');
        joinPoint.returningValue = joinPoint.returning;
        actions.forEach((action => {
            action(joinPoint);
        }))
    }
}
