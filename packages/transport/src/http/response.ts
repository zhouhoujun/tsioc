import { HttpStatusCode, ResponseBase, ResponseHeader, TransportContext, ServerResponse } from '@tsdi/core';
import { isNumber, isString } from '@tsdi/ioc';
import assert = require('assert');
import * as http from 'http';
import * as http2 from 'http2';
import { TLSSocket } from 'tls';
import { Readable } from 'stream';
import { extname } from 'path';
import { encodeUrl, escapeHtml, isBuffer, isStream } from '../utils';
import { emptyStatus, redirectStatus, statusMessage } from './status';
import { CONTENT_DISPOSITION } from './content';
import { HttpRequest } from './request';



export class HttpResponse<T = any> extends ResponseBase<T> implements ResponseHeader {

    get type(): number {
        throw new Error('Method not implemented.');
    }
    get status(): number {
        throw new Error('Method not implemented.');
    }
    get statusMessage(): string {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    get body(): T {
        throw new Error('Method not implemented.');
    }

    getHeaders() {
        throw new Error('Method not implemented.');
    }
    hasHeader(field: string): boolean {
        throw new Error('Method not implemented.');
    }
    getHeader(field: string): string | number | string[] | undefined {
        throw new Error('Method not implemented.');
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: any, val?: any): void {
        throw new Error('Method not implemented.');
    }
    removeHeader(field: string): void {
        throw new Error('Method not implemented.');
    }


}

export class HttpServerResponse extends ServerResponse<any> implements ResponseHeader {

    protected _body: any;
    private _explicitStatus?: boolean;
    private _explicitNullBody?: boolean;


    constructor(readonly context: TransportContext,
        readonly resp: http.ServerResponse | http2.Http2ServerResponse) {
        super();
        this.context.response = this;
    }

    get request(): HttpRequest {
        return this.context.request as HttpRequest;
    }

    get req() {
        return this.request.req;
    }

    get type(): string {
        throw new Error('Method not implemented.');
    }

    set type(type: string) {
        throw new Error('Method not implemented.');
    }

    get status(): HttpStatusCode {
        return this.resp.statusCode;
    }
    /**
     * Set response status code, defaults to OK.
     */
    set status(code: HttpStatusCode) {
        if (this.resp.headersSent) return;

        assert(Number.isInteger(code), 'status code must be a number');
        assert(code >= 100 && code <= 999, `invalid status code: ${code}`);
        this._explicitStatus = true;
        this.resp.statusCode = code;
        if (this.req.httpVersionMajor < 2) this.statusMessage = statusMessage[code];
        if (this.body && emptyStatus[code]) this.body = null;
        this.resp.statusCode = code;
    }
    get statusMessage(): string {
        return this.resp.statusMessage ?? statusMessage[this.status];
    }
    set statusMessage(msg: string) {
        this.resp.statusMessage = msg;
    }
    get contentType(): string {
        return this.resp.getHeader('Content-Type')?.toString() ?? '';
    }
    set contentType(type: string) {
        if (type) {
            this.resp.setHeader('Content-Type', type);
        } else {
            this.resp.removeHeader('Content-Type');
        }
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    get ok(): boolean {
        throw new Error('Method not implemented.');
    }
    set ok(ok: boolean) {
        throw new Error('Method not implemented.');
    }
    get body(): any {
        return this._body;
    }
    set body(val: any) {
        const original = this._body;
        this._body = val;

        // no content
        if (null == val) {
            if (!emptyStatus[this.status]) this.status = 204;
            if (val === null) this._explicitNullBody = true;
            this.removeHeader('Content-Type');
            this.removeHeader('Content-Length');
            this.removeHeader('Transfer-Encoding');
            return;
        }

        // set the status
        if (!this._explicitStatus) this.status = 200;

        // set the content-type only if not yet set
        const setType = !this.hasHeader('Content-Type');

        // string
        if (isString(val)) {
            if (setType) this.contentType = /^\s*</.test(val) ? 'text/html' : 'text/plain';
            this.length = Buffer.byteLength(val);
            return;
        }

        // buffer
        if (isBuffer(val)) {
            if (setType) this.contentType = 'application/octet-stream';
            this.length = val.length;
            return;
        }

        // stream
        if (isStream(val)) {
            this.context.onDestroy(() => {
                if (val instanceof Readable) val.destroy();
            });
            // onFinish(this.response, destroy.bind(null, val));
            if (original != val) {
                val.once('error', err => this.onerror(err));
                // overwriting
                if (null != original) this.removeHeader('Content-Length');
            }

            if (setType) this.contentType = 'application/octet-stream';
            return;
        }

        // json
        this.removeHeader('Content-Length');
        this.contentType = 'application/json';

    }
    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (isNumber(n) && !this.hasHeader('Transfer-Encoding')) {
            this.setHeader('Content-Length', n);
        } else {
            this.removeHeader('Content-Length');
        }
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */

    get length(): number | undefined {
        if (this.hasHeader('Content-Length')) {
            return this.resp.getHeader('Content-Length') as number || 0;
        }

        const { body } = this;
        if (!body || isStream(body)) return undefined;
        if ('string' === typeof body) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body));
    }

    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    redirect(url: string, alt?: string): void {
        if ('back' === url) url = this.getHeader('Referrer') as string || alt || '/';
        this.setHeader('Location', encodeUrl(url));

        // status
        if (!redirectStatus[this.status]) this.status = 302;

        // html
        if (this.accepts('html')) {
            url = escapeHtml(url);
            this.contentType = 'text/html; charset=utf-8';
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }

        // text
        this.contentType = 'text/plain; charset=utf-8';
        this.body = `Redirecting to ${url}.`;
    }

    getHeaders() {
        return this.resp.getHeaders();
    }

    hasHeader(field: string): boolean {
        return this.resp.hasHeader(field);
    }
    getHeader(field: string): string | number | string[] | undefined {
        return this.resp.getHeader(field);
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: any, val?: any): void {
        if (this.resp.headersSent) return;

        if (val) {
            this.resp.setHeader(field as string, val);
        } else {
            const fields = field as Record<string, string | number | string[]>;
            for (const key in fields) {
                this.resp.setHeader(key, fields[key]);
            }
        }
    }

    removeHeader(field: string): void {
        if (this.resp.headersSent) return;
        this.resp.removeHeader(field);
    }

    /**
     * Set Content-Disposition header to "attachment" with optional `filename`.
     *
     * @param filname file name for download.
     * @param options content disposition.
     * @api public
     */
    attachment(filename: string, options?: {
        contentType?: string;
        /**
        * Specifies the disposition type.
        * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
        * but can convey additional information if both parties agree to it).
        * The `type` is normalized to lower-case.
        * @default 'attachment'
        */
        type?: 'attachment' | 'inline' | string | undefined;
        /**
         * If the filename option is outside ISO-8859-1,
         * then the file name is actually stored in a supplemental field for clients
         * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
         * @default true
         */
        fallback?: string | boolean | undefined;
    }): void {
        if (options?.contentType) {
            this.contentType = options.contentType;
        } else if (filename) {
            this.type = extname(filename);
        }
        const func = this.context.getValue(CONTENT_DISPOSITION);
        this.resp.setHeader('Content-Disposition', func(filename, options));
    }

    /**
     * Checks if the request is writable.
     * Tests for the existence of the socket
     * as node sometimes does not set it.
     */
    get writable() {
        // can't write any more after response finished
        // response.writableEnded is available since Node > 12.9
        // https://nodejs.org/api/http.html#http_response_writableended
        // response.finished is undocumented feature of previous Node versions
        // https://stackoverflow.com/questions/16254385/undocumented-response-finished-in-node-js
        if (this.resp.writableEnded || this.resp.finished) return false;

        const socket = this.resp.socket;
        // There are already pending outgoing res, but still writable
        // https://github.com/nodejs/node/blob/v4.4.7/lib/_http_server.js#L486
        if (!socket) return true;
        return socket.writable;
    }

    write(chunk: string | Uint8Array, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding?: BufferEncoding | ((err?: Error | null) => void), cb?: (err?: Error | null) => void): boolean {
        if (this.resp.headersSent) return false;
        if (this.resp instanceof http.ServerResponse) {
            return isString(encoding) ? this.resp.write(chunk, encoding, cb) : this.resp.write(chunk, encoding);
        } else {
            return isString(encoding) ? this.resp.write(chunk, encoding, cb) : this.resp.write(chunk, encoding);
        }
    }

    flushHeaders() {
        if (this.resp instanceof http.ServerResponse) {
            this.resp.flushHeaders();
        }
    }

    throwError(status: number, message?: string): Error;
    throwError(message: string): Error;
    throwError(error: Error): Error;
    throwError(status: any, message?: any): Error {
        throw new Error('Method not implemented.');
    }

}
