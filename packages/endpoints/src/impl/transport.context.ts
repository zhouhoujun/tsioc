import { EMPTY_OBJ, Injector } from '@tsdi/ioc';
import { TransportContext, TransportContextOpts } from '../TransportContext';



export class TransportContextIml<TInput = any, TOutput = any> extends TransportContext<TInput> {

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
        this._url = this._originalUrl = options.url ?? '';
        this._method = options.method ?? '';
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
