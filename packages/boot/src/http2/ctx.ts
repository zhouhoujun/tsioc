import { ApplicationContext, StartupService } from '@tsdi/core';
import { isDefined } from '@tsdi/ioc';
import { Http2Server, Http2ServerRequest, Http2ServerResponse, createServer } from 'http2';
import { Socket } from 'net';
import { HttpResponse, HttpRequest } from '../context';
import { HttpStatusCode } from '../status';


export class Http2Request  extends HttpRequest {

    private _originalUrl: string;
    constructor(protected req: Http2ServerRequest) {
        super();
        const url = this._originalUrl = req.url ?? '';
        this._URL = new URL(url);
    }

    get socket(): Socket {
        return this.req.socket;
    }
    getHeaders(): Record<string, string | string[]> {
        return this.req.headers as Record<string, string | string[]>;
    }
    get originalUrl(): string {
        return this._originalUrl;
    }
    get url(): string {
        return this.req.url;
    }
    set url(url: string) {
        // this.req.url = url;
    }
    get method(): string {
        return this.req.method;
    }
    set method(val: string) {
        (this.req as any).method = val;
    }

    getHeader(name: string): string | string[] {
        return this.req.headers[name] ?? '';
    }
    hasHeader(name: string): boolean {
        return isDefined(this.req.headers[name]);
    }
    setHeader(name: string, value: string | string[]): void {
        this.req.headers[name] = value;
    }
    removeHeader(name: string): void {
        delete this.req.headers[name];
    }
}

export class Http2Response extends HttpResponse {
    get error(): any {
        throw new Error('Method not implemented.');
    }
    set error(err: any) {
        throw new Error('Method not implemented.');
    }
    
    constructor(protected resp: Http2ServerResponse) {
        super();
    }

    get status(): HttpStatusCode {
        return this.resp.statusCode;
    }
    set status(code: HttpStatusCode) {
        this.resp.statusCode = code;
    }
    get socket(): Socket {
        return this.resp.socket;
    }
    getHeaders(): Record<string, string | number | string[]> {
        return this.resp.getHeaders() as Record<string, string | number | string[]>;
    }
    get message(): string {
        return this.resp.statusMessage;
    }
    set message(msg: string) {
        this.resp.statusMessage = msg as any;
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
    getHeader(name: string): string | number | string[] {
        return this.resp.getHeader(name);
    }
    hasHeader(name: string): boolean {
        return this.resp.hasHeader(name);
    }
    setHeader(name: string, value: string | number | string[]): void {
        if(this.headersSent) return;
        this.resp.setHeader(name, value);
    }
    removeHeader(name: string): void {
        if(this.headersSent) return;
        this.resp.removeHeader(name);
    }
}

