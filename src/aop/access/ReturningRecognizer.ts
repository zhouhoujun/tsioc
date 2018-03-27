import { Singleton, IRecognizer, NonePointcut } from '../../core/index';
import { symbols, isPromise, isObservable } from '../../utils/index';
import { ReturningType } from './ReturningType';
import { JoinpointState } from '..';

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