import { Abstract } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';

/**
 * status vaildator.
 */
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
    /**
     * is status or not.
     * @param status 
     */
    abstract isStatus(status: StatusCode): boolean;
    /**
     * is response ok or not.
     * @param status 
     */
    abstract isOk(status: StatusCode): boolean;
    /**
     * is not found or not.
     * @param status 
     */
    abstract isNotFound(status: StatusCode): boolean;
    /**
     * is empty or not.
     * @param status 
     */
    abstract isEmpty(status: StatusCode): boolean;
    /**
     * is empty execption.
     * @param status
     */
    abstract isEmptyExecption(status: StatusCode): boolean;
    /**
     * is redirect or not.
     * @param status 
     */
    abstract isRedirect(status: StatusCode): boolean;
    /**
     * is request failed or not.
     * @param status 
     */
    abstract isRequestFailed(status: StatusCode): boolean;
    /**
     * is server error or not.
     * @param status 
     */
    abstract isServerError(status: StatusCode): boolean;
    /**
     * is retry or not.
     * @param status 
     */
    abstract isRetry(status: StatusCode): boolean;
    /**
     * is redirect with body or not.
     * @param status 
     * @param method 
     */
    abstract redirectBodify(status: StatusCode, method?: string): boolean;
    /**
     * redirect default method.
     */
    abstract redirectDefaultMethod(): string;
}
