import { Injectable, isNil } from '@tsdi/ioc';
import { Header, HeaderAccess, Outgoing, StatusMessageAdapter } from '@tsdi/common';
import * as coap from 'coap';

@Injectable()
export class CoapMessageAdapter extends StatusMessageAdapter<Record<string, any>, coap.OutgoingMessage, any> {
    private incoming?: Record<string, any>;
    private _response?: coap.OutgoingMessage;
    private outgoing?: Outgoing<any>;

    get request(): Record<string, any> {
        return this.incoming!;
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

    bind(request: Record<string, any>, response?: coap.OutgoingMessage): void {
        this.incoming = request;
        this._response = response;
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

    setOutgoing(outgoing: Outgoing<any>) {
        this.outgoing = outgoing;
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

    write(body: any): void {
        if (this.outgoing) {
            this.outgoing.body = body;
        }
    }

    setHeader(name: string, value: Header): void {
        this.outgoing?.setHeader(name, value);
    }

    removeHeader(name: string): void {
        this.outgoing?.removeHeader(name);
    }

    setStatus(code: any, message?: string): void {
        if (this.outgoing) {
            this.outgoing.statusCode = code;
            if (!isNil(message)) {
                this.outgoing.statusMessage = message;
            }
        }
    }

    getStatus(): any { return this.outgoing?.statusCode; }
    getStatusMessage(): any { return this.outgoing?.statusMessage; }
    getError(): any { return this.outgoing?.error; }
    getBody(): any { return this.outgoing?.body; }
    hasHeader(name: string): boolean { return this.outgoing?.hasHeader?.(name) ?? false; }
    isHeadersSent(): boolean { return false; }

    writeError(error: any): void {
        if (this.outgoing) {
            this.outgoing.error = error;
        }
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
