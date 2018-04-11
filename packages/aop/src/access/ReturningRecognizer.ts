import { Singleton, IRecognizer, symbols, isPromise, isObservable } from '@ts-ioc/core';
import { ReturningType } from './ReturningType';
import { JoinpointState } from '../joinpoints/index';
import { NonePointcut } from '../decorators/index';

@NonePointcut()
@Singleton(symbols.IRecognizer, JoinpointState.AfterReturning)
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
