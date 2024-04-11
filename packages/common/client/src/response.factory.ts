import { Injectable } from '@tsdi/ioc';
import { HeadersLike, TransportErrorResponse, TransportEvent, TransportHeaderResponse, TransportResponse } from '@tsdi/common';
import { ResponseEventFactory } from '@tsdi/common/transport';



@Injectable()
export class DefaultResponseEventFactory implements ResponseEventFactory {
    createErrorResponse<TStatus>(options: { url?: string | undefined; headers?: HeadersLike | undefined; status?: TStatus; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportErrorResponse<TStatus> {
        return new TransportErrorResponse(options);
    }
    createHeadResponse<TStatus>(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent<any, TStatus> {
        return new TransportHeaderResponse(options);
    }
    createResponse<TStatus>(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TransportEvent<any, TStatus> {
        return new TransportResponse(options)
    }

}