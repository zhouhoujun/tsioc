import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { Express } from '../../types';
import { Singleton, NonePointcut } from '../../core/index';
import { symbols, isFunction, isObservable, isPromise } from '../../utils/index';
import { ReturningType } from './ReturningType';

@NonePointcut()
@Singleton(symbols.IAdvisorProceeding, ReturningType.observable)
export class AsyncObservableProceeding implements IAdvisorProceeding {
    constructor() {

    }

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        if (joinPoint.returning && isFunction(joinPoint.returning.flatMap)) {
            actions.forEach(action => {
                joinPoint.returning = joinPoint.returning.flatMap((val) => {
                    joinPoint.returningValue = val;
                    let retval = action(joinPoint);
                    if (isObservable(retval)) {
                        return retval.flatMap(() => {
                            return joinPoint.returningValue !== val ? Promise.resolve(joinPoint.returningValue) : joinPoint.returning;
                        });
                    } else if (isPromise(retval)) {
                        return retval.then(() => {
                            return joinPoint.returningValue !== val ? Promise.resolve(joinPoint.returningValue) : joinPoint.returning.toPromise();
                        });
                    } else {
                        return joinPoint.returningValue !== val ? Promise.resolve(joinPoint.returningValue) : joinPoint.returning;
                    }
                });
            });
        } else {
            joinPoint.returningValue = joinPoint.returning;
            actions.forEach((action => {
                action(joinPoint);
            }))
        }
    }
}
