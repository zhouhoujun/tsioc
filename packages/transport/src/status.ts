import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class StatusVaildator<T = number> {
    
    /**
     * no content.
     * server responsed.
     */
    abstract get noContent(): T;
    /**
     * not found.
     * server responsed.
     */
    abstract get notFound(): T;
    /**
     * ok status.
     */
    abstract get ok(): T;
    /**
     * no status.
     */
    abstract get none(): T;
    /**
     * Internal Server Error
     * server responsed.
     */
    abstract get serverError(): T;

    abstract isStatus(status: T): boolean;

    abstract isOk(status: T): boolean;
    abstract isNotFound(status: T): boolean;
    abstract isEmpty(status: T): boolean;
    abstract isRedirect(status: T): boolean;
    abstract isRequestFailed(status: T): boolean;
    abstract isServerError(status: T): boolean;
    abstract isRetry(status: T): boolean;

    abstract redirectBodify(status: T, method?: string): boolean;
    abstract redirectDefaultMethod(): string;
}
