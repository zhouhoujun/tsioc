import { EMPTY_OBJ, Injectable, Injector, isArray, isNil, isString } from '@tsdi/ioc';
import { HEAD, IncomingPacket, LOCALHOST, MessageExecption, OutgoingHeaders, RequestPacket, ResponsePacket, StreamAdapter, TransportSession, isBuffer } from '@tsdi/common';
import { TransportContext, TransportContextFactory } from '../TransportContext';
import { ServerOpts } from '../Server';
import { lastValueFrom } from 'rxjs';
import { ServerTransportSession } from '../transport/session';



export class TransportContextIml<TRequest extends RequestPacket = RequestPacket, TResponse extends ResponsePacket = ResponsePacket, TSocket = any> extends TransportContext<TRequest, TResponse, TSocket> {


    private _url: string;
    private _originalUrl: string;
    private _method: string;
    private _URL?: URL;

    readonly streamAdapter: StreamAdapter;

    constructor(
        injector: Injector,
        readonly session: ServerTransportSession,
        readonly request: TRequest,
        readonly response: TResponse,
        private serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });

        this.setValue(TransportSession, session);
        this.streamAdapter = session.streamAdapter;
        if (!response.id) {
            response.id = request.id;
        }
        if (request.replyTo) {
            response.replyTo = request.replyTo;
        }
        if (request.topic) {
            response.topic = request.topic;
        } else if (request.url) {
            response.url = request.url;
        }

        this._method = request.method ?? '';

        this._url = request.url ?? request.topic ?? '';
        this._originalUrl = request.headers?.['origin-path'] ?? this._url;
        const searhIdx = this._url.indexOf('?');
        if (searhIdx >= 0) {
            (this.request as any)['query'] = this.query;
        }
    }


    /**
     * Get request rul
     */
    get url(): string {
        return this._url;
    }
    /**
     * Set request url
     */
    set url(value: string) {
        this._url = value;
    }

    get originalUrl(): string {
        return this._originalUrl;
    }

    private _query?: Record<string, any>;
    get query(): Record<string, any> {
        if (!this._query) {
            const qs = this._query = {} as Record<string, any>;
            this.URL?.searchParams?.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }

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
            this._URL = this.createURL();
        }
        return this._URL!;
    }

    protected createURL() {
        try {
            return this.parseURL(this.request);
        } catch (err) {
            return Object.create(null);
        }
    }

    protected parseURL(req: RequestPacket): URL {
        const url = req.url ?? req.topic ?? '';
        if (abstl.test(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = this.serverOptions.listenOpts ?? EMPTY_OBJ;
            const protocol = this.serverOptions.protocol;
            const baseUrl = new URL(`${protocol}://${host ?? LOCALHOST}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }

    /**
     * Return request header.
     *
     * The `Referrer` header field is special-cased,
     * both `Referrer` and `Referer` are interchangeable.
     *
     * Examples:
     *
     *     this.get('Content-Type');
     *     // => "text/plain"
     *
     *     this.get('content-type');
     *     // => "text/plain"
     *
     *     this.get('Something');
     *     // => ''
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    getHeader(field: string): string {
        field = this.toHeaderName(field);
        const h = this.request.headers?.[field];

        if (isNil(h)) return '';
        return isArray(h) ? h[0] : String(h);
    }

    /**
     * Returns true if the header identified by name is currently set in the outgoing headers.
     * The header name matching is case-insensitive.
     *
     * Examples:
     *
     *     this.hasHeader('Content-Type');
     *     // => true
     *
     * @param {String} field
     * @return {boolean}
     * @api public
     */
    hasHeader(field: string) {
        return !isNil(this.response.headers?.[field])
    }

    protected toHeaderName(field: string) {
        return field.toLowerCase();
    }

    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set('Foo', ['bar', 'baz']);
     *    this.set('Accept', 'application/json');
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {String|Object|Array} field
     * @param {String} val
     * @api public
     */
    setHeader(field: string, val: string | number | string[]): void;
    /**
     * Set header `field` to `val` or pass
     * an object of header fields.
     *
     * Examples:
     *
     *    this.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
     *
     * @param {OutgoingHeaders} fields
     * @param {String} val
     * @api public
     */
    setHeader(fields: OutgoingHeaders): void;
    setHeader(field: string | OutgoingHeaders, val?: string | number | string[]) {
        if (this.sent) return;
        if (!this.response.headers) {
            this.response.headers = {};
        }
        if (val) {
            this.response.headers[field as string] = val
        } else {
            Object.assign(this.response.headers, field)
        }
    }


    /**
     * Remove header `field` of response.
     *
     * @param {String} name
     * @api public
     */
    removeHeader(field: string): void {
        if (this.sent) return;
        if (!this.response.headers) return;
        delete this.response.headers[field];
    }

    /**
     * Remove all header of response.
     * @api public
     */
    removeHeaders(): void {
        if (this.sent) return;
        this.response.headers = {};

    }

    setResponse(packet: ResponsePacket): void {
        const { headers, payload, ...pkg } = packet;
        Object.assign(this.response, pkg);
        if (headers) this.setHeader(headers);
        this.body = payload;
    }

    get body(): any {
        return this.response.payload;
    }

    set body(value: any) {
        if (!this.streamAdapter.isStream(value)) {
            this._len = undefined;
        }
        this.response.payload = value;
    }

    private _len?: number;
    /**
     * Set Content-Length field to `n`.
     *
     * @param {Number} n
     * @api public
     */
    set length(n: number | undefined) {
        this._len = n;
    }

    /**
     * Return parsed response Content-Length when present.
     *
     * @return {Number}
     * @api public
     */
    get length(): number | undefined {
        if (isNil(this._len)) {
            if (isNil(this.body)) {
                this._len = 0;
            } else if (this.streamAdapter.isStream(this.body)) {
                this._len = undefined;
            } else if (isString(this.body)) {
                this._len = Buffer.byteLength(this.body);
            } else if (isBuffer(this.body)) {
                this._len = this.body.length;
            } else {
                this._len = Buffer.byteLength(JSON.stringify(this.body))
            }
        }
        return this._len;
    }

    /**
     * The request method.
     */
    get method(): string {
        return this._method;
    }

    get sent(): boolean {
        return false;
    }


    // isEmpty(): boolean {
    //     return isNil(this.body)
    // }

    // isHeadMethod(): boolean {
    //     return HEAD === this.method
    // }

    async respond(): Promise<any> {
        if (this.destroyed) return;
        return await lastValueFrom(this.session.send(this));
    }

    throwExecption(execption: MessageExecption): Promise<void> {
        this.execption = execption;
        this.body = null;
        this.response.error = {
            name: execption.name,
            message: execption.message,
            status: execption.status ?? execption.statusCode
        };
        if (!isNil(execption.status)) this.response.status = execption.status;
        this.response.statusText = execption.message;
        return lastValueFrom(this.session.send(this));
    }

}

const abstl = /^\w+:\/\//i;


@Injectable()
export class TransportContextFactoryImpl implements TransportContextFactory {
    create(injector: Injector, session: ServerTransportSession, incoming: IncomingPacket, options?: ServerOpts<any> | undefined): TransportContext {
        return new TransportContextIml(injector, session, incoming.req ?? incoming, incoming.res ?? {}, options);
    }

}