import { Injectable } from '@tsdi/ioc';
import { HeadersLike, ErrorResponse, ResponseEvent, ResponsePacket, HeaderResponse } from '@tsdi/common';
import { ResponseEventFactory } from '@tsdi/common/transport';



@Injectable()
export class DefaultResponseEventFactory implements ResponseEventFactory {
    createErrorResponse<TStatus>(options: { url?: string | undefined; headers?: HeadersLike | undefined; status?: TStatus; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): ErrorResponse<TStatus> {
        return new ErrorResponse(options);
    }
    createHeadResponse<TStatus>(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; }): ResponseEvent<any, TStatus> {
        return new HeaderResponse(options);
    }
    createResponse<TStatus>(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: TStatus; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): ResponseEvent<any, TStatus> {
        return new ResponsePacket(options)
    }

}