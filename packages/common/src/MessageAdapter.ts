import { Abstract } from '@tsdi/ioc';
import { Header } from './headers';
import type { MessageSection } from '@tsdi/core';

@Abstract()
export abstract class MessageAdapter<TRequest = any, TResponse = any> {
    abstract bind(request: TRequest, response?: TResponse): void;

    abstract read(section: MessageSection, name?: string): any;

    abstract write(body: any): void;

    abstract setHeader(name: string, value: Header): void;

    abstract removeHeader(name: string): void;

    abstract setStatus(code: any, message?: string): void;

    abstract writeError(error: any): void;
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

    // Header helpers — used by security interceptors                                                                                                                                           
    abstract getHeader(name: string): string | undefined;
    abstract setHeader(name: string, value: string | string[]): void;
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

export interface HeaderCapableMessageAdapter {
    getHeaders(): Record<string, any>;
    getHeader(name: string): any;
}

export interface ResponseStateCapableMessageAdapter {
    getStatus(): any;
    getStatusMessage(): any;
    getError(): any;
    getBody(): any;
    hasHeader(name: string): boolean;
    isHeadersSent(): boolean;
}

export interface AcceptsCapableMessageAdapter {
    accepts(...args: string[]): string | string[] | false;
    acceptsEncodings(...encodings: string[]): string | string[] | false;
    acceptsCharsets(...charsets: string[]): string | string[] | false;
    acceptsLanguages(...langs: string[]): string | string[] | false;
}

export function isHeaderCapableMessageAdapter(adapter: unknown): adapter is HeaderCapableMessageAdapter {
    return !!adapter
        && typeof (adapter as HeaderCapableMessageAdapter).getHeader === 'function'
        && typeof (adapter as HeaderCapableMessageAdapter).getHeaders === 'function';
}

export function isResponseStateCapableMessageAdapter(adapter: unknown): adapter is ResponseStateCapableMessageAdapter {
    return !!adapter
        && typeof (adapter as ResponseStateCapableMessageAdapter).getStatus === 'function'
        && typeof (adapter as ResponseStateCapableMessageAdapter).getStatusMessage === 'function'
        && typeof (adapter as ResponseStateCapableMessageAdapter).getError === 'function'
        && typeof (adapter as ResponseStateCapableMessageAdapter).getBody === 'function'
        && typeof (adapter as ResponseStateCapableMessageAdapter).hasHeader === 'function'
        && typeof (adapter as ResponseStateCapableMessageAdapter).isHeadersSent === 'function';
}

export function isAcceptsCapableMessageAdapter(adapter: unknown): adapter is AcceptsCapableMessageAdapter {
    return !!adapter
        && typeof (adapter as AcceptsCapableMessageAdapter).accepts === 'function'
        && typeof (adapter as AcceptsCapableMessageAdapter).acceptsEncodings === 'function'
        && typeof (adapter as AcceptsCapableMessageAdapter).acceptsCharsets === 'function'
        && typeof (adapter as AcceptsCapableMessageAdapter).acceptsLanguages === 'function';
}
