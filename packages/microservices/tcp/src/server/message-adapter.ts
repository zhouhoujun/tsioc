import { Injectable, isNil } from '@tsdi/ioc';
import { Header, StatusMessageAdapter } from '@tsdi/common';
import * as net from 'node:net';
import * as tls from 'node:tls';

@Injectable()
export class TcpMessageAdapter extends StatusMessageAdapter<net.Socket | tls.TLSSocket, net.Socket | tls.TLSSocket, any> {
    private responseHeaders = new Map<string, Header>();
    private responseBody: any;
    private responseStatus: any;
    private responseStatusMessage?: string;
    private responseError: any;

    constructor(
        private socket: net.Socket | tls.TLSSocket,
    ) {
        super();
    }

    get request(): net.Socket | tls.TLSSocket {
        return this.socket;
    }

    get response(): net.Socket | tls.TLSSocket {
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
        return {};
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

    read(_section: any, _name?: string): any {
        return undefined;
    }

    getHeader(_name: string): any {
        return undefined;
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
        return this.socket.destroyed;
    }

    writeError(error: any): void {
        this.responseError = error;
    }
}
