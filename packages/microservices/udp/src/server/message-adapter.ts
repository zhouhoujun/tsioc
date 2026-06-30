import { Injectable, isNil } from '@tsdi/ioc';
import { Header, StatusMessageAdapter } from '@tsdi/common';
import * as dgram from 'node:dgram';

@Injectable()
export class UdpMessageAdapter extends StatusMessageAdapter<dgram.Socket, dgram.Socket, any> {
    private responseHeaders = new Map<string, Header>();
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;
    private currentRequest: any;

    constructor(
        private socket: dgram.Socket,
        private responseSocket: dgram.Socket = socket,
    ) {
        super();
        this.currentRequest = socket;
    }

    get request(): dgram.Socket {
        return this.currentRequest;
    }

    get response(): dgram.Socket {
        return this.responseSocket;
    }

    get status(): any {
        return this.responseStatus;
    }

    set status(value: any) {
        this.setStatus(value);
    }

    get isHandled(): boolean {
        return !isNil(this.status) || !isNil(this.payload) || !isNil(this.error);
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
        const adapter = new UdpMessageAdapter(this.socket, this.responseSocket);
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
                if (!name || name === 'body' || name === 'payload') {
                    return body;
                }
                return body?.[name];
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
                return this.status;
            case 'statusMessage':
                return this.getStatusMessage();
            case 'error':
                return this.error;
            default:
                return undefined;
        }
    }

    getHeader(name: string): any {
        const headers = this.currentRequest?.headers;
        return headers?.[name.toLowerCase()] ?? headers?.[name];
    }

    protected onPayloadChange(payload: any): any {
        return payload;
    }

    protected onErrorChange(error: any): any {
        return error;
    }

    setHeader(name: string, value: Header): this {
        this.responseHeaders.set(name.toLowerCase(), value);
        return this;
    }

    removeHeader(name: string): this {
        this.responseHeaders.delete(name.toLowerCase());
        return this;
    }

    getResponseHeaderNames(): string[] {
        return Array.from(this.responseHeaders.keys());
    }

    getResponseHeader(name: string): Header {
        return this.responseHeaders.get(name.toLowerCase());
    }

    setStatus(code: any, message?: string): this {
        this.responseStatus = code;
        if (!isNil(message)) {
            this.responseStatusMessage = message;
        }
        return this;
    }

    getStatusMessage(): any {
        return this.responseStatusMessage;
    }

    getError(): any {
        return this.responseError;
    }

    hasHeader(name: string): boolean {
        return this.responseHeaders.has(name.toLowerCase());
    }

    isHeadersSent(): boolean {
        return false;
    }

    setError(error: any): this {
        this.responseError = error;
        return this;
    }

}
