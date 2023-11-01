import { Abstract, Injectable, getToken, isDefined } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { OutgoingHeaders, RequestPacket, ResHeaders, ResponseEventFactory, ResponsePacket, StatusCode, TransportErrorResponse, TransportEvent, TransportHeaderResponse, TransportRequest, TransportResponse, TransportSession } from '@tsdi/common';
import { Observable, catchError, mergeMap, of, take, throwError } from 'rxjs';

@Abstract()
export abstract class ResponseTransform<T = TransportEvent> {
    /**
     * transform response packet to <T = TransportEvent>
     * @param packet 
     * @param factory 
     */
    abstract transform(req: TransportRequest, packet: ResponsePacket, factory: ResponseEventFactory<T>): Observable<T>;
}

export const defaultTransform = {
    transform(req, packet, factory): Observable<TransportEvent> {
        if (packet.error) {
            return throwError(() => factory.createErrorResponse(packet));
        }
        return of(factory.createResponse(packet));
    },
} as ResponseTransform;

/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend implements Backend<TransportRequest, TransportEvent>, ResponseEventFactory<TransportEvent>  {

    /**
     * handle client request
     * @param req 
     */
    handle(req: TransportRequest): Observable<TransportEvent> {

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
            mergeMap(p => transform.transform(req, p, this))
        );

    }

    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportErrorResponse {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; }): TransportEvent {
        return new TransportHeaderResponse(options) as TransportEvent;
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TransportEvent {
        return new TransportResponse(options) as TransportEvent;
    }

    protected getReqUrl(req: TransportRequest) {
        return req.urlWithParams;
    }

    protected toPacket(url: string, req: TransportRequest) {
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
export class TopicTransportBackend extends TransportBackend {

    protected override getReqUrl(req: TransportRequest) {
        return req.url;
    }

    protected override toPacket(url: string, req: TransportRequest) {
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