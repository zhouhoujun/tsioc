import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class TransportStatus<T = number | string> {
    /**
     * get status code
     */
    abstract get code(): T;
    /**
     * set status code
     */
    abstract set code(code: T);

    abstract parseCode(code?: string | number | null): T;
    /**
     * get state of transport status.
     */
    abstract get state(): States;
    /**
     * set state of transport.
     */
    abstract set state(state: States);

    abstract toState(status: T): States;

    abstract toCode(state: States): T;
    /**
     * is status empty body or not.
     */
    abstract get isEmpty(): boolean;
    /**
     * get status message.
     */
    abstract get message(): string;

    /**
     * set status message.
     */
    abstract set message(msg: string);

}

/**
 * transport states.
 */
export enum States {
    /**
     * ok status code.
     */
    Ok,
    /**
     * bad request status code.
     */
    BadRequest,
    /**
     * not found status code.
     */
    NotFound,
    /**
     * found status.
     */
    Found,
    /**
     * Unauthorized status code.
     */
    Unauthorized,
    /**
     * forbidden status code.
     */
    Forbidden,
    /**
     * not content status code.
     */
    NoContent,
    /**
     * request failed.
     */
    requestFailed,
    /**
     * Internal server error status.
     */
    InternalServerError,
    /**
     * unsupported media type status code.
     */
    UnsupportedMediaType,

    Redirect
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
    redirectBodify(status: string| number, method?: string): boolean;

    /**
     * redirect default request method.
     */
    redirectDefaultMethod(): string;
}
