import { Abstract, Token, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { InterceptorLike, InterceptorType } from './endpoint';
import { IncomingMsg } from './packet';


export interface TransportStrategyOpts<TInput = any, TOutput = any> {
    strategy: TypeOf<TransportStrategy>;
    interceptors?: InterceptorType<TInput, TOutput>[];
    interceptorsToken?: Token<InterceptorLike<TInput, TOutput>>;
}

@Abstract()
export abstract class TransportStatus {
    /**
     * parse response status.
     * @param status 
     */
    abstract parse(status?: string | number | null): number;
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
     * found status.
     */
    abstract get found(): number;
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
     * is the status code vaild or not.
     * @param statusCode 
     */
    abstract isVaild(statusCode: number): boolean;
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
     * 
     * @param status 
     */
    abstract isContinue(status: number): boolean;
    /**
     * is retry status or not.
     * @param status 
     */
    abstract isRetry(status: number): boolean;
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

/**
 * transport strategy.
 */
@Abstract()
export abstract class TransportStrategy {
    /**
     * protocol name
     */
    abstract get protocol(): string;

    abstract get status(): TransportStatus;
    /**
     * the url is absolute url or not.
     * @param url 
     */
    abstract isAbsoluteUrl(url: string): boolean;
    /**
     * is update modle resquest.
     */
    abstract isUpdate(incoming: IncomingMsg): boolean;
    /**
     * is secure or not.
     * @param incoming 
     */
    abstract isSecure(incoming: IncomingMsg): boolean;
    /**
     * url parse.
     * @param url 
     */
    abstract parseURL(incoming: IncomingMsg, opts: ListenOpts, proxy?: boolean): URL;
    /**
     * match protocol or not.
     * @param protocol 
     */
    abstract match(protocol: string): boolean;

}


/**
 * transport strategy.
 */
@Abstract()
export abstract class RedirectTransportStatus extends TransportStatus {

    /**
     * is redirect status or not.
     * @param status
     */
    abstract isRedirect(status: number): boolean;
    /**
     * redirect can with body or not.
     * @param status 
     * @param method 
     */
    abstract redirectBodify(status: number, method?: string): boolean;

    /**
     * redirect default request method.
     */
    abstract redirectDefaultMethod(): string;
}

/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    [x: string]: any;

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
    withCredentials?: boolean;
}
