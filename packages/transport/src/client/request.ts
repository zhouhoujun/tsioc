/* eslint-disable no-case-declarations */
import {
    TransportEvent, TransportRequest,
    ResHeaders, OutgoingHeader,
    ResHeadersLike, Incoming, Outgoing, ReqHeaders, TransportParams
} from '@tsdi/core';
import { Abstract, InvocationContext } from '@tsdi/ioc';



@Abstract()
export abstract class RequestAdapter<TRequest = TransportRequest, TResponse = TransportEvent, TStatus = number> {

    abstract createRequest(req: TRequest): Outgoing;

    abstract createErrorResponse(options: {
        url?: string,
        headers?: Record<string, OutgoingHeader>;
        status: TStatus;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    abstract createHeadResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
    }): TResponse;

    abstract createResponse(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
        body?: any;
    }): TResponse;

    abstract getResponseEvenName(): string;

    abstract send(request: Outgoing, req: TRequest, callback: (error?: Error | null) => void): void;

    abstract parseHeaders(incoming: Incoming): ResHeaders;

    abstract parseStatus(headers: ResHeaders, incoming: Incoming): TStatus;

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

}
