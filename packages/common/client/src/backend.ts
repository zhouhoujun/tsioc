import { Injectable, isDefined } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { OutgoingHeaders, RequestPacket, ResHeaders, TransportErrorResponse, TransportEvent, TransportHeaderResponse, TransportRequest, TransportResponse, TransportSession } from '@tsdi/common';
import { Observable, catchError, first, map, take, throwError } from 'rxjs';

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

        let obs$: Observable<any>;
        switch(req.observe) {
            case 'emit':
                obs$ = session.send(pkg).pipe(take(1));
                break;
            case 'observe':
                obs$ = session.request(pkg);
                break;
            default:
                obs$ = session.request(pkg).pipe(take(1))
                break;
        }
        return obs$.pipe(
                map(p => {
                    if (p.error) {
                        throw p.error;
                    }
                    return this.createResponse(p as any);
                }),
                catchError((err, caught) => {
                    return throwError(() => this.createErrorResponse({ url, error: err, status: err.status ?? err.statusCode, statusText: err.message }))
                })
            );

    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportErrorResponse(options) as TResponse;
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse {
        return new TransportHeaderResponse(options) as TResponse;
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status: number | string; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TResponse {
        return new TransportResponse(options) as TResponse;
    }

    protected getReqUrl(req: TRequest) {
        return req.urlWithParams;
    }

    protected toPacket(url: string, req: TRequest) {
        const pkg = {
            url
        } as RequestPacket;
        if (req.method) {
            pkg.method = req.method;
        }
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (isDefined(req.body)) {
            pkg.payload = req.body;
        }

        return pkg;
    }
}

/**
 * transport client endpoint backend.
 */
@Injectable()
export class TopicTransportBackend<TRequest extends TransportRequest = TransportRequest, TResponse = TransportEvent> extends TransportBackend<TRequest, TResponse> {

    protected override getReqUrl(req: TRequest) {
        return req.url;
    }

    protected override toPacket(url: string, req: TRequest) {
        const pkg = {
            topic: url
        } as RequestPacket;
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (isDefined(req.body)) {
            pkg.payload = req.body;
        }

        return pkg;
    }
}