import { symbols, isFunction, isObservable, isPromise, Express, Singleton } from '@tsioc/core';
import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/index';

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
