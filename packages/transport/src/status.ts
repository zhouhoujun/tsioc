import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class StatusVaildator<T = any> {
    
    abstract get noContent(): T;

    abstract isOk(status: T): boolean;
    abstract isNotFound(status: T): boolean;
    abstract isEmpty(status: T): boolean;
    abstract isRedirect(status: T): boolean;
    abstract isRequestFailed(status: T): boolean;
    abstract isServerError(status: T): boolean;
    abstract isRetry(status: T): boolean;
}
