import { Abstract, Injector, Token } from '@tsdi/ioc';
import { TransportErrorResponse, TransportEvent, HeadersLike, HeaderFields, } from '@tsdi/common';
import { Observable } from 'rxjs';
import { CodingsOpts } from './codings/options';
import { EncodingsFactory } from './codings/encodings';
import { DecodingsFactory } from './codings/decodings';
import { CodingsContext } from './codings/context';


export class SessionContext extends CodingsContext {

}

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

    write?(socket: any, data: any, encoding?: string, cb?: (err?: Error | null) => void): void;

    end?(socket: any, data: any, encoding?: string, cb?: (err?: Error | null) => void): void;

    handleMessage?(socket: any, context?: CodingsContext): Observable<any>;

    initContext?(ctx: CodingsContext, msg?: any): void;

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
