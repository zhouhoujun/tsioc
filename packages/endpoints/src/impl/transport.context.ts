import { EMPTY_OBJ, Injector, isString } from '@tsdi/ioc';
import { RequestPacket, ResponsePacket, isBuffer } from '@tsdi/common';
import { TransportContext, TransportContextOpts } from '../TransportContext';



export class TransportContextIml<TInput extends RequestPacket = RequestPacket, TOutput extends ResponsePacket = ResponsePacket> extends TransportContext<TInput, TOutput> {

    private _url: string;
    private _originalUrl: string;
    private _method: string;
    private _socket: any;
    private _len?: number;

    constructor(
        injector: Injector,
        readonly request: TInput,
        readonly response: TOutput,
        options: TransportContextOpts = EMPTY_OBJ
    ) {
        super(injector, { ...options, args: request });
        if (!response.id) {
            response.id = request.id;
        }
        if(request.replyTo){
            response.replyTo = request.replyTo;
        }
        if (request.topic) {
            response.topic = request.topic;
        } else if (request.url) {
            response.url = request.url;
        }
        this._url = this._originalUrl = request.url ?? request.topic ?? '';
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

    set length(n: number | undefined) {
        this._len = n;
    }

    get length(): number | undefined {
        return this._len;
    }

    get body(): any {
        return this.response.payload;
    }
    set body(value: any) {
        if (isString(value)) {
            this.length = Buffer.byteLength(value);
        }
        if (isBuffer(value)) {
            this.length = value.length;

        }
        this.response.payload = value;
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
