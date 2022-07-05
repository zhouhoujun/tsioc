import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { ServerContext, ExecptionFilter, MiddlewareLike, Protocol, HeaderContext, AssetContext } from '@tsdi/core';
import { Injectable, isNumber, isString, tokenId } from '@tsdi/ioc';
import { ctype, hdr } from '../../consts';
import { isStream, xmlRegExp } from '../../utils';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';



/**
 * TCP context.
 */
@Injectable()
export class TcpContext extends ServerContext<TcpServRequest, TcpServResponse> implements HeaderContext, AssetContext {

    readonly protocol: Protocol = 'tcp';

    private _url?: string;
    get url(): string {
        if (!this._url) {
            this._url = this.request.url;
        }
        return this._url;
    }
    set url(value: string) {
        this._url = value;
    }

    get originalUrl(): string {
        return this.request.url;
    }

    private _URL?: URL;
    /**
     * Get WHATWG parsed URL.
     * Lazily memoized.
     *
     * @return {URL|Object}
     * @api public
     */
    get URL(): URL {
        /* istanbul ignore else */
        if (!this._URL) {
            const originalUrl = this.originalUrl || ''; // avoid undefined in template string
            try {
                this._URL = new URL(`tcp://${originalUrl}`);
            } catch (err) {
                this._URL = Object.create(null);
            }
        }
        return this._URL!;
    }

    get pathname(): string {
        return this.URL.pathname;
    }

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = {} as Record<string, any>;
            this.URL.searchParams.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }

    get method(): string {
        return this.request.method;
    }

    isUpdate(): boolean {
        return this.request.method === 'PUT' || this.request.getHeader(hdr.OPERATION) === 'update';
    }

    get body(): any {
        return this.response.body;
    }
    set body(value: any) {
        this.response.body = value;
        const setType = !this.hasHeader(hdr.CONTENT_TYPE);
        if (isString(value)) {
            if (setType) this.contentType = xmlRegExp.test(value) ? ctype.TEXT_HTML : ctype.TEXT_PLAIN;
            this.length = Buffer.byteLength(value);
        }
    }

    get length(): number | undefined {
        if (this.hasHeader(hdr.CONTENT_LENGTH)) {
            return this.response.getHeader(hdr.CONTENT_LENGTH) as number || 0
        }

        const { body } = this;
        if (!body || isStream(body)) return undefined;
        if (isString(body)) return Buffer.byteLength(body);
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body))
    }

    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        if (isNumber(n) && !this.hasHeader(hdr.TRANSFER_ENCODING)) {
            this.setHeader(hdr.CONTENT_LENGTH, n)
        } else {
            this.removeHeader(hdr.CONTENT_LENGTH)
        }
    }

    get status(): number {
        return this.response.status
    }
    set status(status: number) {
        this.response.status = status;
    }
    get statusMessage(): string {
        return this.response.statusMessage ?? statusMessage[this.status as HttpStatusCode]
    }

    set statusMessage(msg: string) {
        this.response.statusMessage = msg;
    }

    get ok(): boolean {
        return this.response.ok;
    }

    get sent(): boolean {
        return this.response.sent;
    }

    is(type: string | string[]): string | false | null {
        throw new Error('Method not implemented.');
    }
    get contentType(): string {
        return this.response.getHeader(hdr.CONTENT_TYPE) as string;
    }
    set contentType(type: string) {
        this.setHeader(hdr.CONTENT_TYPE, type);
    }
    getHeader(field: string): string | number | string[] | undefined {
        return this.request.getHeader(field);
    }
    hasHeader(field: string): boolean {
        return this.response.hasHeader(field);
    }
    setHeader(field: string, val: string | number | string[]): void;
    setHeader(fields: Record<string, string | number | string[]>): void;
    setHeader(field: any, val?: any): void {
        this.response.setHeader(field, val);
    }
    removeHeader(field: string): void {
        this.response.removeHeader(field);
    }

}

/**
 * TCP Middlewares.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike<TcpContext>[]>('TCP_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');
