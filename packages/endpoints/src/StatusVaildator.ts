import { Abstract } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';

@Abstract()
export abstract class StatusVaildator {
    
    /**
     * no content.
     * server responsed.
     */
    abstract get noContent(): StatusCode;
    /**
     * not found.
     * server responsed.
     */
    abstract get notFound(): StatusCode;
    /**
     * found.
     * server responsed.
     */
    abstract get found(): StatusCode;
    /**
     * ok status.
     */
    abstract get ok(): StatusCode;
    /**
     * no status.
     */
    abstract get none(): StatusCode;
    /**
     * Internal Server Error
     * server responsed.
     */
    abstract get serverError(): StatusCode;
    /**
     * gateway timeout status.
     */
    abstract get gatewayTimeout(): StatusCode;

    abstract isStatus(status: StatusCode): boolean;

    abstract isOk(status: StatusCode): boolean;
    abstract isNotFound(status: StatusCode): boolean;
    abstract isEmpty(status: StatusCode): boolean;
    abstract isEmptyExecption(status: StatusCode): boolean;
    abstract isRedirect(status: StatusCode): boolean;
    abstract isRequestFailed(status: StatusCode): boolean;
    abstract isServerError(status: StatusCode): boolean;
    abstract isRetry(status: StatusCode): boolean;

    abstract redirectBodify(status: StatusCode, method?: string): boolean;
    abstract redirectDefaultMethod(): string;
}
