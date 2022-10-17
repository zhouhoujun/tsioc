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
    isEmpty(code: T): boolean {
        const state = this.toState(code);
        return state == States.NoContent
            || state == States.ResetContent
            || state == States.NotModified
    }

    isRedirect(code: T): boolean {
        const state = this.toState(code);
        return state == States.Found
            || state == States.MovedPermanently
            || state == States.SeeOther
            || state == States.UseProxy
            || state == States.TemporaryRedirect
            || state == States.PermanentRedirect
    }

    isRertry(code: T): boolean {
        const state = this.toState(code);
        return state == States.BadGateway
            || state == States.ServiceUnavailable
            || state == States.GatewayTimeout
    }
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
    Ok = 1,


    /**
     * no content state flags.
     */
    NoContent,
    /**
     * reset content.
     * no content state.
     */
    ResetContent,
    /**
     * not modified.
     */
    NotModified,


    /**
     * found flags
     * redirect state.
     */
    Found,
    /**
     * moved permanently.
     * redirect state.
     */
    MovedPermanently,
    /**
     * see other.
     * redirect state.
     */
    SeeOther,
    /**
     * use proxy.
     * redirect state.
     */
    UseProxy,
    /**
     * temporary redirect.
     * redirect state.
     */
    TemporaryRedirect,
    /**
     * Permanent Redirect.
     * redirect state.
     */
    PermanentRedirect,


    /**
     * bad request state flags.
     */
    BadRequest,
    /**
     * Unauthorized state flags.
     */
    Unauthorized,
    /**
     * forbidden state flags.
     */
    Forbidden,
    /**
     * not found state flags.
     */
    NotFound,
    /**
     * method not allowed.
     */
    MethodNotAllowed,
    /**
     * request timeout.
     */
    RequestTimeout,
    /**
     * unsupported media type state flags.
     */
    UnsupportedMediaType,

    /**
     * Internal server error state flags.
     */
    InternalServerError,

    
    /**
     * Not implemeted.
     */
    NotImplemented,


    /**
     * bad gateway.
     * retry state
     */
    BadGateway,
    /**
     * retry state
     */
    ServiceUnavailable,
    /**
     * retry state
     */
    GatewayTimeout

}


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
