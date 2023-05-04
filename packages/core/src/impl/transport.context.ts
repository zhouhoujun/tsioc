import { EMPTY_OBJ, Injector } from '@tsdi/ioc';
import { TransportContext, TransportContextOpts } from '../transport/context';



export class TransportContextIml<TInput = any> extends TransportContext<TInput> {

    private _url: string;
    private _method: string;
    constructor(
        injector: Injector,
        options: TransportContextOpts = EMPTY_OBJ
    ) {
        super(injector, options);
        this._url = options.url ?? '';
        this._method = options.method ?? '';
    }

    /**
     * Get request rul
     */
    get url(): string{
        return this._url;
    }
    /**
     * Set request url
     */
    set url(value: string) {
        this._url = value;
    }
    
    /**
     * The request method.
     */
    get method(): string {
        return this._method;
    }

}
