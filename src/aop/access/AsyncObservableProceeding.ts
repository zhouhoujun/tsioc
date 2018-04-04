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
        if (isFunction(joinPoint.returning.flatMap)) {
            actions.forEach(action => {
                joinPoint.returning = joinPoint.returning.flatMap((val) => {
                    joinPoint.returningValue = val;
                    action(joinPoint);
                    if (isObservable(joinPoint.returningValue)) {
                        return joinPoint.returningValue;
                    } else if (isPromise(joinPoint.returningValue)) {
                        return joinPoint.returningValue;
                    } else {
                        return Promise.resolve(joinPoint.returningValue);
                    }
                });
            });
        } else {
            actions.forEach(action => {
                action(joinPoint);
            });
        }
    }
}
