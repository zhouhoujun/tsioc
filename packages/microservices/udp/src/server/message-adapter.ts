import { Injectable, isNil } from '@tsdi/ioc';
import { Header, StatusMessageAdapter } from '@tsdi/common';
import * as dgram from 'node:dgram';

@Injectable()
export class UdpMessageAdapter extends StatusMessageAdapter<dgram.Socket, dgram.Socket, any> {
    private responseHeaders = new Map<string, Header>();
    private responseBody: any;
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;
    private currentRequest: any;

    constructor(
        private socket: dgram.Socket,
    ) {
        super();
        this.currentRequest = socket;
    }

    get request(): dgram.Socket {
        return this.currentRequest;
    }

    get response(): dgram.Socket {
        return this.socket;
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
        return this.currentRequest?.query ?? {};
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

    setRequestData(request: any): void {
        this.currentRequest = request ?? this.socket;
    }

    forkRequest(request: any): UdpMessageAdapter {
        const adapter = new UdpMessageAdapter(this.socket);
        adapter.setRequestData(request);
        return adapter;
    }

    read(section: any, name?: string): any {
        const req = this.currentRequest;
        switch (section) {
            case 'headers':
                return name ? this.getHeader(name) : (req?.headers ?? {});
            case 'payload':
            case 'body': {
                const body = req?.body ?? req?.payload;
                return name ? body?.[name] : body;
            }
            case 'params': {
                const params = req?.params;
                return name ? params?.[name] : params;
            }
            case 'query': {
                const query = req?.query;
                return name ? query?.[name] : query;
            }
            case 'path': {
                const paths = req?.paths;
                return name ? paths?.[name] : paths;
            }
            case 'topic':
                return req?.topic ?? req?.url ?? req?.pattern;
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

    getHeader(name: string): any {
        const headers = this.currentRequest?.headers;
        return headers?.[name.toLowerCase()] ?? headers?.[name];
    }

    setHeader(name: string, value: Header): void {
        this.responseHeaders.set(name.toLowerCase(), value);
    }

    removeHeader(name: string): void {
        this.responseHeaders.delete(name.toLowerCase());
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

    setStatus(code: any, message?: string): void {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
    }

    getStatus(): any {
        return this.responseStatus;
    }

    getStatusMessage(): any {
        return this.responseStatusMessage;
    }

    getError(): any {
        return this.responseError;
    }

    getBody(): any {
        return this.responseBody;
    }

    hasHeader(name: string): boolean {
        return this.responseHeaders.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return false;
    }

    writeError(error: any): void {
        this.responseError = error;
    }
}
