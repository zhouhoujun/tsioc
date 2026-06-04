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

    abstract get req(): TRequest;
    abstract get res(): TResponse;

    abstract read(section: MessageSection, name?: string): any;

    abstract write(body: any): void;

    abstract setHeader(name: string, value: Header): void;

    abstract removeHeader(name: string): void;

    abstract writeError(error: any): void;

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
    get req(): TRequest { return this.request; }
    get res(): TResponse { return this.response; }

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
}

