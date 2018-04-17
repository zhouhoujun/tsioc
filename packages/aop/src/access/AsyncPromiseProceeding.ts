import { Express, Singleton } from '@ts-ioc/core';
import { IAdvisorProceeding } from './IAdvisorProceeding';
import { Joinpoint } from '../joinpoints/index';
import { ReturningType } from './ReturningType';
import { NonePointcut } from '../decorators/index';
import { AopSymbols } from '../symbols';

@NonePointcut()
@Singleton(AopSymbols.IAdvisorProceeding, ReturningType.promise)
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
                            return joinPoint.returningValue;
                        });
                });
            }));
        }
    }
}
