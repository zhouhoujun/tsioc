import { Injectable, getToken, isDefined } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { OutgoingHeaders, TransportRequest, ResHeaders, ResponseEventFactory, ResponsePacket, TransportSession, hdr } from '@tsdi/common';
import { ResponseTransform } from '@tsdi/common/client';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpRequest, HttpResponse } from '@tsdi/common/http';
import { Observable, catchError, finalize, mergeMap, of, take, throwError } from 'rxjs';


const defaultTransform = {
    transform(req, packet, factory): Observable<HttpEvent> {
        if (packet.error) {
            return throwError(() => factory.createErrorResponse(packet));
        }
        return of(factory.createResponse(packet));
    },
} as ResponseTransform<HttpEvent>;



/**
 * transport http client endpoint backend.
 */
@Injectable()
export class HttpTransportBackend implements Backend<HttpRequest, HttpEvent>, ResponseEventFactory<HttpEvent>  {

    /**
     * handle client request
     * @param req 
     */
    handle(req: HttpRequest): Observable<HttpEvent> {

        const url = this.getReqUrl(req);

        const pkg = this.toPacket(url, req);
        const context = req.context;
        const session = context.get(TransportSession);
        const transform = context.get(getToken(ResponseTransform, session.getPacketStrategy())) ?? defaultTransform;

        let obs$: Observable<ResponsePacket>;
        switch (req.observe) {
            case 'emit':
                obs$ = session.send(pkg, context).pipe(take(1));
                break;
            case 'observe':
                obs$ = session.request(pkg, context);
                break;
            default:
                obs$ = session.request(pkg, context).pipe(take(1))
                break;
        }
        return obs$.pipe(
            catchError((err, caught) => {
                return throwError(() => this.createErrorResponse({ url, error: err, status: err.status ?? err.statusCode, statusText: err.message }))
            }),
            mergeMap(p => transform.transform(req, p, this).pipe(
                finalize(() => {
                    if (p.stream && req.observe !== 'observe') p.stream.destroy?.();
                })
            ))
        );

    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpErrorResponse {
        return new HttpErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpEvent {
        return new HttpHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): HttpEvent {
        return new HttpResponse(options);
    }

    protected getReqUrl(req: HttpRequest) {
        return req.urlWithParams;
    }

    protected toPacket(url: string, req: HttpRequest) {
        const pkg = {
            url,
            headers: req.headers.getHeaders()
        } as TransportRequest;

        if (!pkg.headers) {
            pkg.headers = {};
        }
        if (req.method) {
            pkg.method = req.method;
        }
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (isDefined(req.body)) {
            pkg.payload = req.body;
        }

        if (!pkg.headers[hdr.CONTENT_TYPE]) pkg.headers[hdr.CONTENT_TYPE] = req.detectContentTypeHeader()!;

        return pkg;
    }
}
