import { Injectable, getToken, isDefined } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { HeadersLike } from '@tsdi/common';
import { Packet, ResponseEventFactory, ResponsePacket, TransportSession } from '@tsdi/common/transport';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpRequest, HttpResponse } from '@tsdi/common/http';
import { Observable, catchError, finalize, mergeMap, of, take, throwError } from 'rxjs';


// const defaultTransform = {
//     transform(req, packet, factory): Observable<HttpEvent> {
//         if (packet.error) {
//             return throwError(() => factory.createErrorResponse(packet));
//         }
//         return of(factory.createResponse(packet));
//     },
// } as ResponseTransform<HttpEvent>;



/**
 * transport http client endpoint backend.
 */
@Injectable()
export class HttpTransportBackend implements Backend<HttpRequest, HttpEvent>, ResponseEventFactory<HttpEvent, HttpErrorResponse, number>  {

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

    createErrorResponse(options: { url?: string; headers?: HeadersLike; status?: number; error?: any; statusText?: string; statusMessage?: string; }): HttpErrorResponse {
        return new HttpErrorResponse(options);
    }
    createHeadResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: number; statusText?: string; statusMessage?: string; }): HttpEvent {
        return new HttpHeaderResponse(options);
    }
    createResponse(options: { url?: string; ok?: boolean; headers?: HeadersLike; status?: number; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): HttpEvent {
        return new HttpResponse(options);
    }

    protected getReqUrl(req: HttpRequest) {
        return req.urlWithParams;
    }

    protected toPacket(url: string, req: HttpRequest) {
        const pkg = {
            url,
            headers: req.headers.getHeaders()
        } as Packet;

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

        if (!pkg.headers['content-type']) pkg.headers['content-type'] = req.detectContentTypeHeader()!;

        return pkg;
    }
}
