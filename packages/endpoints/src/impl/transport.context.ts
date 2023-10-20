import { EMPTY_OBJ, Injector, isNil, isString } from '@tsdi/ioc';
import { RequestPacket, ResponsePacket, StreamAdapter, isBuffer } from '@tsdi/common';
import { TransportContext, TransportContextOpts } from '../TransportContext';



export class TransportContextIml<TInput extends RequestPacket = RequestPacket, TOutput extends ResponsePacket = ResponsePacket> extends TransportContext<TInput, TOutput> {

    private _url: string;
    private _originalUrl: string;
    private _method: string;
    private _socket: any;
    readonly streamAdapter: StreamAdapter;

    constructor(
        injector: Injector,
        readonly request: TInput,
        readonly response: TOutput,
        options: TransportContextOpts = EMPTY_OBJ
    ) {
        super(injector, { ...options, args: request });
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
        this._originalUrl = request.headers?.['origin-path'] ?? request.url ?? request.topic ?? '';
        this._url = request.url ?? request.topic ?? '';
        this._method = request.method ?? '';
        this._socket = options.socket || null;
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

    get socket(): any {
        return this._socket;
    }
}
