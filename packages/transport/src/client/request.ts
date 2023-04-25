/* eslint-disable no-case-declarations */
import { TransportEvent, TransportRequest, ResHeaders, ReqHeaders, TransportParams, ResponsePacket, WritableStream } from '@tsdi/core';
import { Abstract, InvocationContext } from '@tsdi/ioc';


/**
 * request adapter.
 */
@Abstract()
export abstract class RequestAdapter<TRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> {

    /**
     * update req.
     * @param req 
     * @param update 
     */
    abstract update(req: TRequest, update: {
        headers?: ReqHeaders,
        context?: InvocationContext,
        reportProgress?: boolean,
        params?: TransportParams,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        body?: any | null,
        method?: string,
        url?: string,
        setHeaders?: { [name: string]: string | string[] },
        setParams?: { [param: string]: string },
    }): TRequest;

    /**
     * create request stream by req.
     * @param req 
     */
    abstract createRequest(req: TRequest): WritableStream;

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    abstract send(request: WritableStream, req: TRequest, callback: (error?: Error | null) => void): void;

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
     * response event of request stream.
     */
    abstract getResponseEvenName(): string;

    /**
     * parse headers of incoming message.
     * @param incoming 
     */
    abstract parseHeaders(incoming: any): ResHeaders;

    /**
     * parse status and message of incoming message.
     * @param incoming 
     * @param headers 
     */
    abstract parseStatus(incoming: any, headers: ResHeaders): ResponsePacket<TStatus>;
}
