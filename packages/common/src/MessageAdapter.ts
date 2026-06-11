import { Abstract, Exception } from '@tsdi/ioc';
import { Header } from './headers';

export type MessageSection =
    'headers'
    | 'payload'
    | 'body'
    | 'params'
    | 'query'
    | 'path'
    | 'topic'
    | 'status'
    | 'statusMessage'
    | 'error'
    | 'cookie'
    | 'session';

@Abstract()
export abstract class MessageAdapter<TRequest = any, TResponse = any> {


    abstract get request(): TRequest;
    abstract get response(): TResponse;

    private _payload: any;
    /**
     * get response payload, used by sender/transfer stages to serialize output.
     */
    get payload(): any {
        return this._payload;
    }
    /**
     * set response payload, used by sender/transfer stages to serialize output.
     * @param payload response payload
     */
    set payload(payload: any) {
        this._payload = this.onPayloadChange(payload);
    }

    setPayload(payload: any): this {
        this._payload = this.onPayloadChange(payload);
        return this;
    }

    /**
     * change the payload format, used by sender/transfer stages to serialize output.
     * check payload content type and convert it to the format suitable for transport, for example, convert stream to buffer, or convert object to string by JSON.stringify.
     * check status code and convert it to error object if the status code is 4xx or 5xx, for example, convert { status: 404, message: 'Not Found' } to new NotFoundException('Not Found').
     * @param payload 
     * @returns formatted payload
     */
    protected abstract onPayloadChange(payload: any): any;

    /**
     * set response header, used by security interceptors to verify request signature.
     * @param name header name
     * @param value header value
     */
    abstract setHeader(name: string, value: Header): this;
    /**
     * remove response header, used by security interceptors to verify request signature.
     * @param name header name
     */
    abstract removeHeader(name: string): this;

    private _error: Exception|null = null;
    /**
     * get response error.
     */
    get error(): Exception|null {
        return this._error;
    }
    /**
     * set response error, used by sender/transfer stages to serialize failures.
     * @param error error object
     */
    set error(error: Exception|null) {
        this._error = this.onErrorChange(error);
    }
    
    setError(error: any): this {
        this._error = this.onErrorChange(error);
        return this;
    }

    protected abstract onErrorChange(error: any): Exception;


    /**
     * read request message section, used by security interceptors to verify request signature.
     * @param section message section name
     * @param name message section name, used when the section is 'headers' or 'params'
     * @returns message section value
     */
    abstract read(section: MessageSection, name?: string): any;

    forkRequest(_request: TRequest): MessageAdapter<TRequest, TResponse> {
        return this;
    }

    /**
     * set request data, used by security interceptors to verify request signature.
     * @param _request 
     * @returns 
     */
    setRequestData(_request: TRequest): void {
        return;
    }

    /**
     * get all request headers, used by security interceptors to verify request signature.
     * @returns 
     */
    getHeaders(): Record<string, any> {
        return {};
    }

    /** get request header, used by security interceptors to verify request signature.
     * @param name header name
     * @returns header value
     */
    getHeader(_name: string): any {
        return undefined;
    }

    /**
     * has the request header, used by security interceptors to verify request signature.
     * @param _name 
     * @returns 
     */
    hasHeader(_name: string): boolean {
        return false;
    }

    /**
     * request accepts content type, used by content negotiation interceptors to negotiate response content type.
     * @param _args 
     * @returns 
     */
    accepts(..._args: string[]): string | string[] | false {
        return false;
    }

    /**
     * request accepts encoding, used by content negotiation interceptors to negotiate response content encoding.
     * @param _encodings 
     * @returns 
     */
    acceptsEncodings(..._encodings: string[]): string | string[] | false {
        return false;
    }

    /**
     * a request accepts charset, used by content negotiation interceptors to negotiate response content charset.
     * @param _charsets 
     * @returns 
     */
    acceptsCharsets(..._charsets: string[]): string | string[] | false {
        return false;
    }

    /**
     * request accepts language, used by content negotiation interceptors to negotiate response content language.
     * @param _langs 
     * @returns 
     */
    acceptsLanguages(..._langs: string[]): string | string[] | false {
        return false;
    }
}


@Abstract()
export abstract class StatusMessageAdapter<
    TRequest = any,
    TResponse = any,
    TStatus = any
> extends MessageAdapter<TRequest, TResponse> {

    abstract get request(): TRequest;
    abstract get response(): TResponse;
    abstract get status(): TStatus;
    abstract set status(value: TStatus);
    abstract setStatus(code: any, message?: string): this;
    abstract get isHandled(): boolean;
    abstract get isCommitted(): boolean;
    abstract handle(): Promise<void>;
    abstract commit(): void;
    abstract destroy(): Promise<void>;

    abstract getStatusMessage(): any;
    abstract hasHeader(name: string): boolean;
    abstract isHeadersSent(): boolean;

    getResponseHeaderNames(): string[] {
        return [];
    }

    getResponseHeader(_name: string): Header | undefined {
        return undefined;
    }

    // Header helpers — used by security interceptors
    abstract getHeader(name: string): any;

    // Query params — used by security (jwt, oauth, oauth2)
    abstract get query(): Record<string, any>;
}

export interface MessageWritable {
    write(chunk: any, encoding?: string): void;
    end(chunk?: any, encoding?: string): void;
}

export interface MessageSendable {
    /**
     * Write the adapter's accumulated state (status, headers, body) to an
     * HTTP-like response object.  Handles streaming, HEAD method, and
     * content-type negotiation.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param headers 
     */
    sendHeaders(headers?: Record<string, Header>): void;
    /**
     * Write the adapter's accumulated state (status, headers, body) to an
     * HTTP-like response object.  Handles streaming, HEAD method, and
     * content-type negotiation.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param response  handler return value to use when the adapter body is empty
     */
    sendResponse(response?: any): void;

    /**
     * Map an error to an HTTP status code and write an error response body
     * to both the adapter state and the raw response object.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param err  thrown exception
     */
    sendError(err: any): void;
}


@Abstract()
export abstract class RestfulRequestAdapter<
    TRequest = any,
    TResponse = any,
    TStatus = any
> extends StatusMessageAdapter<TRequest, TResponse, TStatus> {

    abstract get cookies(): { get(name: string): string | undefined; set(name: string, value?: string, opts?: Record<string, any>): void };
    abstract get secure(): boolean;
    abstract get session(): Record<string, any> | undefined;
    get body(): any {
        return this.payload;
    }
    set body(value: any) {
        this.payload = value;
    }

    setBody(body: any): this {
        return this.setPayload(body);
    }

    abstract get hostname(): string;
    abstract get method(): string;
    abstract get path(): string;
    abstract get originalUrl(): string;
    abstract redirect(url: string, status?: number): void;
    abstract render(template: string, data?: Record<string, any>): Promise<void>;
    abstract getHeader(name: string): string | undefined;

    /**
     * Write the adapter's accumulated state (status, headers, body) to an
     * HTTP-like response object.  Handles streaming, HEAD method, and
     * content-type negotiation.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param headers 
     */
    abstract sendHeaders(headers?: Record<string, Header>): void;
    /**
     * Write the adapter's accumulated state (status, headers, body) to an
     * HTTP-like response object.  Handles streaming, HEAD method, and
     * content-type negotiation.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param response  handler return value to use when the adapter body is empty
     */
    abstract sendResponse(response?: any): void;

    /**
     * Map an error to an HTTP status code and write an error response body
     * to both the adapter state and the raw response object.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param err  thrown exception
     */
    abstract sendError(err: any): void;
}

