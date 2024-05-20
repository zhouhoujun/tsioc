import { Abstract, Injector, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, HeaderFields, } from '@tsdi/common';
import { Observable } from 'rxjs';
import { CodingsOpts } from './codings/options';
import { EncodingsFactory } from './codings/encodings';
import { DecodingsFactory } from './codings/decodings';
import { CodingsContext } from './codings/context';
import { IReadableStream } from './stream';


/**
 * transport options.
 */
export interface TransportOpts extends CodingsOpts {
    /**
     * encodings Factory.
     */
    readonly encodingsFactory?: Token<EncodingsFactory>;
    /**
     * decodings Factory.
     */
    readonly decodingsFactory?: Token<DecodingsFactory>;

    readonly headerFields?: HeaderFields;

    readonly defaultMethod?: string;
    /**
     * message event of socket.
     */
    readonly messageEvent?: string;
    /**
     * message event handle of socket.
     * @param args 
     */
    messageEventHandle?(...args: any[]): any;

    /**
     * pipe endcoed data to socket
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     */
    pipeTo?(socket: any, data: IReadableStream, originData: any, ctx: CodingsContext): Promise<void>;
    /**
     * write endcoed data to socket.
     * @param socket 
     * @param data 
     * @param originData 
     * @param ctx 
     * @param cb 
     */
    write?(socket: any, data: any, originData: any, ctx: CodingsContext, cb?: (err?: Error | null) => void): void;

    /**
     * custom handle mesasge from socket.
     * 
     * @param socket 
     * @param context 
     */
    handleMessage?(socket: any, context?: CodingsContext): Observable<any>;

    beforeEncode?(context: CodingsContext, input: any): any | Promise<any>;
    afterEncode?(ctx: CodingsContext, data: any, msg: any): any | Promise<any>;
    
    beforeDecode?(context: CodingsContext, msg: any): any | Promise<any>;
    afterDecode?(context: CodingsContext, msg: any, decoded: any): Buffer | IReadableStream | Promise<Buffer | IReadableStream>;

    readonly timeout?: number;
}


/**
 * base transport session.
 */
export abstract class AbstractTransportSession<TSocket = any, TInput = any, TOutput = any, TMsg = any, TContext = any> {
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * session context.
     */
    abstract get injector(): Injector;
    /**
     * send.
     * @param data 
     */
    abstract send(data: TInput, context?: TContext): Observable<TMsg>;

    /**
     * receive
     * @param req the message response for.
     */
    abstract receive(context?: TContext): Observable<TOutput>;

    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}



/**
 * response factory.
 */
@Abstract()
export abstract class ResponseEventFactory<TResponse = TransportEvent, TErrorResponse = TransportErrorResponse, TStatus = any> {
    abstract createErrorResponse(options: { url?: string; headers?: HeadersLike; status?: TStatus; error?: any; statusText?: string; statusMessage?: string; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; }): TResponse;
    abstract createResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: TStatus; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): TResponse;
}
