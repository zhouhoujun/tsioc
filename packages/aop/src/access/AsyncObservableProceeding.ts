import { isFunction, isObservable, isPromise, Express, Singleton } from '@ts-ioc/core';
import { IAdvisorProceeding, AdvisorProceedingToken } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/NonePointcut';

@NonePointcut()
@Singleton(AdvisorProceedingToken, ReturningType.observable)
export class AsyncObservableProceeding implements IAdvisorProceeding {
    constructor() {

    }

    proceeding(joinPoint: Joinpoint, ...actions: Express<Joinpoint, any>[]) {
        // if (isObservable(joinPoint.returning)) {
        //     if (isFunction(joinPoint.returning.pipe)) {
        //         const flatMap = require('rxjs/operators').flatMap;
        //         actions.forEach(action => {
        //             joinPoint.returning = joinPoint.returning.pipe(
        //                 flatMap((val) => {
        //                     joinPoint.returningValue = val;
        //                     action(joinPoint);
        //                     if (isObservable(joinPoint.returningValue)) {
        //                         return joinPoint.returningValue;
        //                     } else if (isPromise(joinPoint.returningValue)) {
        //                         return joinPoint.returningValue;
        //                     } else {
        //                         return Promise.resolve(joinPoint.returningValue);
        //                     }
        //                 }));
        //         });
        //     } else
        if (isObservable(joinPoint.returning) && isFunction(joinPoint.returning.flatMap)) {
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
