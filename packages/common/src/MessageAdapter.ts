import { Abstract } from '@tsdi/ioc';
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

    abstract read(section: MessageSection, name?: string): any;

    abstract write(body: any): void;

    abstract setHeader(name: string, value: Header): void;

    abstract removeHeader(name: string): void;

    abstract writeError(error: any): void;

    forkRequest(_request: TRequest): MessageAdapter<TRequest, TResponse> {
        return this;
    }

    setRequestData(_request: TRequest): void {
        return;
    }

    getHeaders(): Record<string, any> {
        return {};
    }

    getHeader(_name: string): any {
        return undefined;
    }

    hasHeader(_name: string): boolean {
        return false;
    }

    accepts(..._args: string[]): string | string[] | false {
        return false;
    }

    acceptsEncodings(..._encodings: string[]): string | string[] | false {
        return false;
    }

    acceptsCharsets(..._charsets: string[]): string | string[] | false {
        return false;
    }

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
    abstract get isHandled(): boolean;
    abstract get isCommitted(): boolean;
    abstract handle(): Promise<void>;
    abstract commit(): void;
    abstract destroy(): Promise<void>;

    abstract setStatus(code: any, message?: string): void;
    abstract getStatus(): any;
    abstract getStatusMessage(): any;
    abstract getError(): any;
    abstract getBody(): any;
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
    abstract setHeader(name: string, value: Header): void;
    abstract removeHeader(name: string): void;

    // Query params — used by security (jwt, oauth, oauth2)
    abstract get query(): Record<string, any>;
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
    abstract get body(): any;
    abstract set body(value: any);
    abstract get hostname(): string;
    abstract get method(): string;
    abstract get path(): string;
    abstract get originalUrl(): string;
    abstract redirect(url: string, status?: number): void;
    abstract render(template: string, data?: Record<string, any>): Promise<void>;
    abstract json(data: any): void;
    abstract send(data: any): void;
    abstract html(data: string): void;
    abstract text(data: string): void;
    abstract getHeader(name: string): string | undefined;

    /**
     * Write the adapter's accumulated state (status, headers, body) to an
     * HTTP-like response object.  Handles streaming, HEAD method, and
     * content-type negotiation.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param res  raw HTTP response (ServerResponse / Http2ServerResponse)
     * @param response  handler return value to use when the adapter body is empty
     */
    abstract sendResponse(res: any, response: any): void;

    /**
     * Map an error to an HTTP status code and write an error response body
     * to both the adapter state and the raw response object.
     * Each HTTP-based transport (http, mcp, grpc) provides its own
     * implementation.
     * @param res  raw HTTP response (ServerResponse / Http2ServerResponse)
     * @param err  thrown exception
     */
    abstract sendError(res: any, err: any): void;
}

