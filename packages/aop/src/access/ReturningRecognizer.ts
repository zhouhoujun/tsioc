import { Singleton, IRecognizer, isPromise, isObservable, RecognizerToken } from '@ts-ioc/core';
import { ReturningType } from './ReturningType';
import { JoinpointState } from '../joinpoints';
import { NonePointcut } from '../decorators';

@NonePointcut()
@Singleton(RecognizerToken, JoinpointState.AfterReturning)
export class ReturningRecognizer implements IRecognizer {
    constructor() {

    }

    recognize(value: any): string {
        if (isPromise(value)) {
            return ReturningType.promise;
        }

        if (isObservable(value)) {
            return ReturningType.observable;
        }

        return ReturningType.sync;
    }
}
