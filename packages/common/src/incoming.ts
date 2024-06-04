import { HeadersLike } from './headers';
import { Packet, PacketInitOpts, PacketOpts } from './packet';
import { ParameterCodec, RequestParams } from './params';


export interface IncomingOpts<T = any> extends PacketInitOpts<T>, PacketOpts {

    /**
     * request method.
     */
    method?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request params.
     */
    params?: RequestParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;

    /**
     * request payload, request body.
     */
    payload?: T;
    /**
     * request body. alias of payload.
     */
    body?: T | null;
    /**
     * request timeout
     */
    timeout?: number;
    /**
     * for restful
     */
    withCredentials?: boolean;

}


/**
 * Incoming packet.
 */
export abstract class IncomingPacket<T = any> extends Packet<T> {
    /**
     * client side timeout.
     */
    readonly timeout?: number;
    readonly method: string;
    readonly params: RequestParams;

    constructor(init: IncomingOpts<T>) {
        super(init, init)
        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
        this.timeout = init.timeout;
    }

    abstract clone(): IncomingPacket<T>;
    abstract clone(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingPacket<T>
    abstract clone<V>(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingPacket<V>;

    protected override cloneOpts(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        method?: string;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): IncomingOpts {
        const init = super.cloneOpts(update) as IncomingOpts;
        init.method = update.method ?? this.method;
        // `setParams` are used.
        let params = update.params || this.params;

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }
        init.params = params;
        return init;
    }

    override toJson(): Record<string, any> {
        const rcd = super.toJson();
        if (this.params.size) rcd.params = this.params.toRecord();
        if (this.method) rcd.method = this.method;
        if (this.timeout) rcd.timeout = this.timeout;
        return rcd;
    }

}
