import { Injectable } from '@tsdi/ioc';
import { ResponseEventFactory } from '@tsdi/common/transport';
import { HeadersLike } from '@tsdi/common';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpResponse } from '@tsdi/common/http';


@Injectable()
export class HttpResponseEventFactory implements ResponseEventFactory<HttpEvent, HttpErrorResponse, number> {
    createErrorResponse(options: { url?: string | undefined; headers?: HeadersLike | undefined; status?: number; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpErrorResponse {
        return new HttpErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpHeaderResponse {
        return new HttpHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: HeadersLike | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): HttpEvent<any> {
        return new HttpResponse(options)
    }

}