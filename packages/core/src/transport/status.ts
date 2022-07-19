import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class TransportStatus {
    /**
     * ok status code.
     */
    abstract get ok(): number;
    /**
     * bad request status code.
     */
    abstract get badRequest(): number;
    /**
     * not found status code.
     */
    abstract get notFound(): number;
    /**
     * Unauthorized status code.
     */
    abstract get unauthorized(): number;
    /**
     * forbidden status code.
     */
    abstract get forbidden(): number;
    /**
     * not content status code.
     */
    abstract get noContent(): number;
    /**
     * Internal server error status.
     */
    abstract get serverError(): number;
    /**
     * unsupported media type status code.
     */
    abstract get unsupportedMediaType(): number;
    /**
     * is not found status or not.
     * @param status 
     */
    abstract isNotFound(status: number): boolean;
    /**
     * is empty status or not.
     * @param status 
     */
    abstract isEmpty(status: number): boolean;
    /**
     * is ok status or not.
     * @param status 
     */
    abstract isOk(status: number): boolean;
    /**
     * is retry status or not.
     * @param status 
     */
    abstract isRetry(status: number): boolean;

    /**
     * is redirect status or not.
     * @param status
     */
    abstract isRedirect(status: number): boolean;

    /**
     * redirect default request method.
     */
    abstract redirectDefaultMethod(): string;
    
    /**
     * redirect can with body or not.
     * @param status 
     * @param method 
     */
    abstract redirectBodify(status: number, method?: string): boolean;

    /**
     * is request failed status or not.
     * @param status 
     */
    abstract isRequestFailed(status: number): boolean;

    /**
     * is server error status or not.
     * @param status 
     */
    abstract isServerError(status: number): boolean;

    /**
     * get status default message.
     * @param status 
     */
    abstract message(status: number): string;


}