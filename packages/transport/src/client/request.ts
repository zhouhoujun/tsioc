/* eslint-disable no-case-declarations */
import {
    TransportEvent, TransportRequest,
    ResHeaders, OutgoingHeader,
    ResHeadersLike, Incoming, Outgoing, ReqHeaders, TransportParams
} from '@tsdi/core';
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
    abstract createRequest(req: TRequest): Outgoing;

    /**
     * send request.
     * @param request 
     * @param req 
     * @param callback 
     */
    abstract send(request: Outgoing, req: TRequest, callback: (error?: Error | null) => void): void;

    /**
     * create error response.
     * @param options 
     */
    abstract createErrorResponse(options: {
        url?: string,
        headers?: Record<string, OutgoingHeader>;
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
        headers?: ResHeadersLike;
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
        headers?: ResHeadersLike;
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
    abstract parseHeaders(incoming: Incoming): ResHeaders;
    /**
     * parse status of incoming message.
     * @param incoming 
     * @param headers 
     */
    abstract parseStatus(incoming: Incoming, headers: ResHeaders): TStatus;
}
