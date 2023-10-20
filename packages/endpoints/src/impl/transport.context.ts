import { EMPTY_OBJ, Injector, isNil, isString } from '@tsdi/ioc';
import { LOCALHOST, RequestPacket, ResponsePacket, StreamAdapter, isBuffer } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';



export class TransportContextIml<TRequest extends RequestPacket = RequestPacket, TResponse extends ResponsePacket = ResponsePacket, TSocket = any> extends TransportContext<TRequest, TResponse, TSocket> {

    private _url: string;
    private _originalUrl: string;
    private _method: string;
    private _URL?: URL;

    readonly streamAdapter: StreamAdapter;

    constructor(
        injector: Injector,
        readonly socket: TSocket,
        readonly request: TRequest,
        readonly response: TResponse,
        private serverOptions: ServerOpts = EMPTY_OBJ
    ) {
        super(injector, { ...serverOptions, args: request });
        this.streamAdapter = injector.get(StreamAdapter);
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
            const qs = this._query = { } as Record<string, any>;
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
            const baseUrl = new URL(`${protocol}://${host ?? LOCALHOST }:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }
    }


    get body(): any {
        return this.response.payload;
    }

    set body(value: any) {
        this._len = undefined;
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

}

const abstl = /^\w+:\/\//i;