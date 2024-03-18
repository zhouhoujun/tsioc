import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class StatusAdapter<TStatus = any> {
    
    /**
     * no content.
     * server responsed.
     */
    abstract get noContent(): TStatus;
    /**
     * not found.
     * server responsed.
     */
    abstract get notFound(): TStatus;
    /**
     * found.
     * server responsed.
     */
    abstract get found(): TStatus;
    /**
     * ok status.
     */
    abstract get ok(): TStatus;
    /**
     * no status.
     */
    abstract get none(): TStatus;
    /**
     * Internal Server Error
     * server responsed.
     */
    abstract get serverError(): TStatus;
    /**
     * gateway timeout status.
     */
    abstract get gatewayTimeout(): TStatus;

    abstract isStatus(status: TStatus): boolean;

    abstract isOk(status: TStatus): boolean;
    abstract isNotFound(status: TStatus): boolean;
    abstract isEmpty(status: TStatus): boolean;
    abstract isEmptyExecption(status: TStatus): boolean;
    abstract isRedirect(status: TStatus): boolean;
    abstract isRequestFailed(status: TStatus): boolean;
    abstract isServerError(status: TStatus): boolean;
    abstract isRetry(status: TStatus): boolean;

    abstract redirectBodify(status: TStatus, method?: string): boolean;
    abstract redirectDefaultMethod(): string;
}
