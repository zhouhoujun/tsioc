import { ApplicationContext, Boot, Headers, StartupService } from '@tsdi/core';
import { isArray } from '@tsdi/ioc';
import { Server, IncomingMessage, ServerResponse, createServer } from 'http';
import { Socket } from 'net';
import { HttpResponse, HttpRequest } from '../context';
import { HttpStatusCode } from '../status';


export class Http1Request extends HttpRequest {

    private _originalUrl: string;
    constructor(protected req: IncomingMessage) {
        super();
        const url = this._originalUrl = req.url ?? '';
        this._URL = new URL(url);
    }

    get originalUrl(): string {
        return this._originalUrl;
    }

    get url(): string {
        return this.req.url ?? '';
    }
    set url(url: string) {
        this.req.url = url;
    }
    get method(): string {
        return this.req.method ?? '';
    }
    set method(val: string) {
        this.req.method = val;
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(obj: any) {
        throw new Error('Method not implemented.');
    }

    get socket(): Socket {
        return this.req.socket;
    }

    getHeaders(): Record<string, string | number | string[]> {
        return this.req.headers as Record<string, string | number | string[]>;
    }

    getHeader(name: string): string | string[] | number {
        return this.req.headers[name] ?? '';
    }

    hasHeader(name: string): boolean {
        throw new Error('Method not implemented.');
    }
    setHeader(name: string, value: string | number | string[]): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(name: string): void {
        throw new Error('Method not implemented.');
    }

}

export class Http1Response extends HttpResponse {

    constructor(protected resp: ServerResponse) {
        super();
    }

    get status(): HttpStatusCode {
        return this.resp.statusCode;
    }
    set status(code: HttpStatusCode) {
        this.resp.statusCode = code;
    }

    get socket(): Socket {
        return this.resp.socket!;
    }

    get message(): string | undefined {
        throw new Error('Method not implemented.');
    }
    set message(msg: string | undefined) {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(val: any) {
        throw new Error('Method not implemented.');
    }
    get length(): number {
        throw new Error('Method not implemented.');
    }
    set length(n: number) {
        throw new Error('Method not implemented.');
    }
    get headersSent(): boolean {
        return this.resp.headersSent;
    }

    getHeaders(): Record<string, string | number | string[]> {
        return this.resp.getHeaders() as Record<string, string | number | string[]>;
    }

    getHeader(name: string): string | number {
        const val = this.resp.getHeader(name);
        return isArray(val) ? val[0] : val ?? '';
    }
    hasHeader(name: string): boolean {
        return this.resp.hasHeader(name);
    }
    setHeader(name: string, value: string | number | string[]): void {
        this.resp.setHeader(name, value);
    }
    removeHeader(name: string): void {
        this.resp.removeHeader(name)
    }

}

