import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { Express } from '../../types';
import { Singleton, NonePointcut } from '../../core/index';
import { symbols } from '../../utils/index';
import { ReturningType } from './ReturningType';

@NonePointcut()
@Singleton(symbols.IAdvisorProceeding, ReturningType.promise)
export class AsyncPromiseProceeding implements IAdvisorProceeding {

    constructor() {

    }

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        if (joinPoint.returning) {
            actions.forEach((action => {
                joinPoint.returning = joinPoint.returning.then((val) => {
                    joinPoint.returningValue = val;
                    return Promise.resolve(action(joinPoint))
                        .then(() => {
                            return joinPoint.returningValue !== val ? joinPoint.returningValue :
                                joinPoint.returning;
                        });
                });
            }));
        }
    }
}