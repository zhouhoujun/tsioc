import { TransportEvent, TransportRequest, ResHeaders, ResponsePacket, IWritableStream, Encoder } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


/**
 * request adapter.
 */
@Abstract()
export abstract class ResponseAdapter<TResponse = TransportEvent, TStatus = number> {

    /**
     * create error response.
     * @param options 
     */
    abstract createErrorResponse(options: {
        url?: string,
        headers?: ResHeaders;
        status: TStatus;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    /**
     * create header response.
     * @param options 
     */
    abstract createHeadResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeaders;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    /**
     * create response.
     * @param options 
     */
    abstract createResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeaders;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
        body?: any;
    }): TResponse;

    /**
     * parse headers of incoming message.
     * @param incoming 
     */
    abstract parseHeaders(incoming: any): ResHeaders;

    /**
     * parse packet via incoming message.
     * @param incoming 
     * @param headers 
     */
    abstract parsePacket(incoming: any, headers: ResHeaders): ResponsePacket<TStatus>;
}


/**
 * request adapter.
 */
@Abstract()
export abstract class RequestAdapter<TRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> extends ResponseAdapter<TResponse, TStatus> {

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    abstract send(req: TRequest, encoder?: Encoder): Observable<TResponse>;
}

/**
 * streamable request adapter.
 */
@Abstract()
export abstract class StreamRequestAdapter<TRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> extends ResponseAdapter<TResponse, TStatus> {

    /**
     * create request stream by req.
     * @param req 
     */
    abstract createRequest(req: TRequest): IWritableStream;

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    abstract send(request: IWritableStream, req: TRequest, callback: (error?: Error | null) => void): void;

    /**
     * response event of request stream.
     */
    abstract getResponseEvenName(): string;
}
