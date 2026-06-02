import { Injectable, isNil } from '@tsdi/ioc';
import { Header, HeaderAccess, StatusMessageAdapter } from '@tsdi/common';
import * as coap from 'coap';

@Injectable()
export class CoapMessageAdapter extends StatusMessageAdapter<Record<string, any>, coap.OutgoingMessage, any> {
    private responseHeaders = new Map<string, Header>();
    private responseBody: any;
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;

    constructor(
        private incoming: Record<string, any>,
        private _response?: coap.OutgoingMessage,
    ) {
        super();
    }

    get request(): Record<string, any> {
        return this.incoming;
    }

    get response(): coap.OutgoingMessage {
        return this._response!;
    }

    get status(): any {
        return this.getStatus();
    }

    set status(value: any) {
        this.setStatus(value);
    }

    get isHandled(): boolean {
        return !isNil(this.getStatus()) || !isNil(this.getBody()) || !isNil(this.getError());
    }

    get isCommitted(): boolean {
        return this.isHeadersSent();
    }

    get query(): Record<string, any> {
        return this.incoming?.query ?? {};
    }

    async handle(): Promise<void> {
        return;
    }

    commit(): void {
        return;
    }

    async destroy(): Promise<void> {
        return;
    }

    read(section: any, name?: string): any {
        switch (section) {
            case 'headers':
                return name ? this.header(name) : this.headers();
            case 'payload':
                return name ? this.payload(name) : this.payload();
            case 'body':
                return name ? this.body(name) : this.body();
            case 'params':
                return name ? this.param(name) : this.params();
            case 'query':
                return name ? this.queryValue(name) : this.query;
            case 'path':
                return name ? this.path(name) : this.path();
            case 'topic':
                return this.topic();
            case 'status':
                return this.getStatus();
            case 'statusMessage':
                return this.getStatusMessage();
            case 'error':
                return this.getError();
            default:
                return undefined;
        }
    }

    getHeaders(): Record<string, any> {
        return this.headers();
    }

    getHeader(name: string): any {
        return this.header(name);
    }

    getResponseHeaderNames(): string[] {
        return Array.from(this.responseHeaders.keys());
    }

    getResponseHeader(name: string): Header {
        return this.responseHeaders.get(name.toLowerCase());
    }

    write(body: any): void {
        this.responseBody = body;
    }

    setHeader(name: string, value: Header): void {
        this.responseHeaders.set(name.toLowerCase(), value);
    }

    removeHeader(name: string): void {
        this.responseHeaders.delete(name.toLowerCase());
    }

    setStatus(code: any, message?: string): void {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
    }

    getStatus(): any { return this.responseStatus; }
    getStatusMessage(): any { return this.responseStatusMessage; }
    getError(): any { return this.responseError; }
    getBody(): any { return this.responseBody; }
    hasHeader(name: string): boolean { return this.responseHeaders.has(name.toLowerCase()); }
    isHeadersSent(): boolean { return false; }

    writeError(error: any): void {
        this.responseError = error;
    }

    protected headers(): Record<string, any> {
        return this.incoming?.headers ?? {};
    }

    protected header(name: string): any {
        const incoming = this.incoming;
        if (!incoming) {
            return undefined;
        }
        if (typeof incoming.getHeader === 'function') {
            return incoming.getHeader(name);
        }
        const headers = incoming.headers as HeaderAccess | Record<string, any> | undefined;
        return (headers as HeaderAccess | undefined)?.getHeader?.(name)
            ?? (headers as Record<string, any> | undefined)?.[name.toLowerCase()]
            ?? (headers as Record<string, any> | undefined)?.[name];
    }

    protected payload(field?: string): any {
        const payload = this.incoming?.payload ?? this.incoming?.body;
        if (field === undefined) {
            return payload;
        }
        return payload ? (payload as any)[field] : undefined;
    }

    protected body(field?: string): any {
        const body = this.incoming?.body ?? this.incoming?.payload;
        if (field === undefined) {
            return body;
        }
        return body ? (body as any)[field] : undefined;
    }

    protected params(): Record<string, any> | undefined {
        return this.incoming?.params;
    }

    protected param(name: string): any {
        return this.incoming?.params?.[name];
    }

    protected queryValue(name?: string): any {
        const query = this.incoming?.query;
        if (name === undefined) {
            return query;
        }
        return query?.[name];
    }

    protected path(name?: string): any {
        const path = this.incoming?.paths;
        if (name === undefined) {
            return path;
        }
        return path?.[name];
    }

    protected topic(): string | undefined {
        return this.incoming?.pattern;
    }
}
