import { ApplicationContext, Boot, Headers, StartupService } from '@tsdi/core';
import { Server, IncomingMessage, ServerResponse, createServer } from 'http';
import { HttpResponse } from '../context';
import { HttpStatusCode } from '../status';


export class HttpHeaders extends Headers {

    constructor(protected resp: ServerResponse) {
        super();
    }

    get referrer(): string {
        return '';
    }
    append(name: string, value: string | string[] | number): void {
        this.resp.setHeader(name, value);
    }
    delete(name: string): void {
        this.resp.removeHeader(name);
    }
    get(name: string): string | string[] | number {
        return this.resp.getHeader(name) ?? '';
    }
    has(name: string): boolean {
        return this.resp.hasHeader(name);
    }
    set(name: string, value: number | string | string[]): void {
        this.resp.setHeader(name, value);
    }
    forEach(callbackfn: (value: string | string[] | number, key: string, parent: Headers) => void, thisArg?: any): void {
        const headers = this.resp.getHeaders();
        for(let n in headers){
            callbackfn(headers[n] as string | string[] | number, n, this)
        }
    }
}

export class Http1Response extends HttpResponse {

    private _headers: HttpHeaders;
    constructor(protected resp: ServerResponse) {
        super();
        this._headers = new HttpHeaders(resp);
    }
    get status(): HttpStatusCode {
        return this.resp.statusCode;
    }
    set status(code: HttpStatusCode) {
        this.resp.statusCode = code;
    }

    get headers(): Headers {
        return this._headers;
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

}

