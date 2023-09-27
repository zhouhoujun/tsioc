import { Injectable } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { OutgoingHeaders, RequestPacket, ResHeaders, TransportErrorResponse, TransportEvent, TransportHeaderResponse, TransportRequest, TransportResponse, TransportSession } from '@tsdi/common';
import { Observable, catchError, map, of, throwError } from 'rxjs';

/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent> implements Backend<TRequest, TResponse>  {

    /**
     * handle client request
     * @param req 
     */
    handle(req: TRequest): Observable<TResponse> {

        const url = this.getReqUrl(req);

        const pkg = this.toPacket(url, req);
        const session = req.context.get(TransportSession);

        return session.request(pkg)
            .pipe(
                map(p => {
                    if(p.error){
                        throw p.error;
                    }
                    return this.createResponse(p as any);
                }),
                catchError((err, caught) => {
                    return throwError(()=> this.createErrorResponse({ url, error: err, status: err.status ?? err.statusCode, statusText: err.message }))
                })
            );

    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportErrorResponse(options) as TResponse;
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportHeaderResponse(options) as TResponse;
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; }): TResponse {
        return new TransportResponse(options) as TResponse;
    }

    protected getReqUrl(req: TRequest) {
        return req.urlWithParams;
    }

    protected toPacket(url: string, req: TRequest) {
        const pkg = {
            method: req.method,
            headers: req.headers.getHeaders(),
            url,
            payload: req.body
        } as RequestPacket;

        return pkg;
    }
}

