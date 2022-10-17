import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class TransportStatus<T = number | string> {

    abstract isValidCode(code: T): boolean;

    abstract parseCode(code?: string | number | null): T;

    abstract toState(status: T): States;

    abstract toCode(state: States): T;
    /**
     * is status empty body or not.
     */
    abstract isEmpty(code: T): boolean;
    /**
     * get status message.
     */
    abstract message(code: T): string;

}

/**
 * transport states.
 */
export enum States {
    None = 0,
    /**
     * ok state flags.
     */
    Ok,
    /**
     * bad request state flags.
     */
    BadRequest,
    /**
     * not found state flags.
     */
    NotFound,
    /**
     * found status.
     */
    Found,
    /**
     * Unauthorized state flags.
     */
    Unauthorized,
    /**
     * forbidden state flags.
     */
    Forbidden,
    /**
     * not content state flags.
     */
    NoContent,
    /**
     * request failed.
     */
    requestFailed,
    /**
     * Internal server error state flags.
     */
    InternalServerError,
    /**
     * unsupported media type state flags.
     */
    UnsupportedMediaType,
    /**
     * redirect state flags
     */
    Redirect,
    /**
     * retry state flags
     */
    Retry
}

// @Abstract()
// export abstract class TransportStatus {
//     /**
//      * parse response status.
//      * @param status 
//      */
//     abstract parse(status?: string | number | null): number;
//     /**
//      * ok status code.
//      */
//     abstract get ok(): number;
//     /**
//      * bad request status code.
//      */
//     abstract get badRequest(): number;
//     /**
//      * not found status code.
//      */
//     abstract get notFound(): number;
//     /**
//      * found status.
//      */
//     abstract get found(): number;
//     /**
//      * Unauthorized status code.
//      */
//     abstract get unauthorized(): number;
//     /**
//      * forbidden status code.
//      */
//     abstract get forbidden(): number;
//     /**
//      * not content status code.
//      */
//     abstract get noContent(): number;
//     /**
//      * Internal server error status.
//      */
//     abstract get serverError(): number;
//     /**
//      * unsupported media type status code.
//      */
//     abstract get unsupportedMediaType(): number;
//     /**
//      * is the status code vaild or not.
//      * @param statusCode 
//      */
//     abstract isVaild(statusCode: number): boolean;
//     /**
//      * is not found status or not.
//      * @param status 
//      */
//     abstract isNotFound(status: number): boolean;
//     /**
//      * is empty status or not.
//      * @param status 
//      */
//     abstract isEmpty(status: number): boolean;
//     /**
//      * is ok status or not.
//      * @param status 
//      */
//     abstract isOk(status: number): boolean;
//     /**
//      * 
//      * @param status 
//      */
//     abstract isContinue(status: number): boolean;
//     /**
//      * is retry status or not.
//      * @param status 
//      */
//     abstract isRetry(status: number): boolean;
//     /**
//      * is request failed status or not.
//      * @param status 
//      */
//     abstract isRequestFailed(status: number): boolean;

//     /**
//      * is server error status or not.
//      * @param status 
//      */
//     abstract isServerError(status: number): boolean;

//     /**
//      * get status default message.
//      * @param status 
//      */
//     abstract message(status: number): string;

// }



/**
 * redirect transport state.
 */
export interface RedirectTransportStatus {

    /**
     * redirect can with body or not.
     * @param status 
     * @param method 
     */
    redirectBodify(status: string | number, method?: string): boolean;

    /**
     * redirect default request method.
     */
    redirectDefaultMethod(): string;
}
