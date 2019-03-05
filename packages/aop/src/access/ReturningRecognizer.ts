import { Singleton, isPromise, isObservable, IocRecognizer } from '@ts-ioc/ioc';
import { ReturningType } from './ReturningType';
import { JoinpointState } from '../joinpoints';
import { NonePointcut } from '../decorators/NonePointcut';

@NonePointcut()
@Singleton(IocRecognizer, JoinpointState.AfterReturning)
export class ReturningRecognizer extends IocRecognizer {

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
