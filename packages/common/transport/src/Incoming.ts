import { HeadersLike, IHeaders, Packet, PacketOpts, ParameterCodec, Pattern, RequestParams } from '@tsdi/common';
import { IReadableStream } from './stream';


/**
 * Incoming message
 */
export interface Incoming<T = any> {

    id?: number | string;

    url?: string;

    method?: string;

    pattern?: Pattern;

    headers: HeadersLike;

    body?: T | null

    rawBody?: any;

    path?: any;

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader?(field: string): boolean;
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader?(field: string): string | undefined;

}

/**
 * Incoming stream
 */
export interface IncomingStream extends IReadableStream {
    get headers(): IHeaders;
}



/**
 * Incoming factory.
 */
export abstract class IncomingFactory {
    abstract create(): Incoming;
    abstract create<T>(): Incoming<T>;
}

/**
 * incoming options
 */
export interface IncomingOpts<T = any> extends PacketOpts<T> {

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

    defaultMethod?: string;

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
        super(init)
        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
        this.timeout = init.timeout;
    }

    /**
     * has header in packet or not.
     * @param packet 
     * @param field 
     */
    hasHeader(field: string): boolean {
        return this.headers.has(field)
    }
    /**
     * get header from packet.
     * @param packet 
     * @param field 
     */
    getHeader(field: string): string | undefined {
        return this.headers.getHeader(field);
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


// /**
//  * client incoming message.
//  */
// export interface ResponseIncoming<T = any> extends Incoming<T> {
//     type?: string | number;
//     error?: any;
//     ok?: boolean;
//     status?: string | number;
//     statusText?: string;
//     statusMessage?: string;
// }

