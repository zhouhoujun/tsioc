import { Injectable } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { OutgoingHeaders, ResHeaders, ResponseEventFactory } from '@tsdi/common';
import { ClientTransportSession } from '@tsdi/common/client';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpRequest, HttpResponse } from '@tsdi/common/http';
import { Observable, take } from 'rxjs';


@Injectable()
export class HttpResponseEventFactory implements ResponseEventFactory<HttpEvent> {
    createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpErrorResponse {
        return new HttpErrorResponse(options);
    }
    createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; }): HttpEvent {
        return new HttpHeaderResponse(options);
    }
    createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: number; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): HttpEvent {
        return new HttpResponse(options);
    }
}


/**
 * transport http client endpoint backend.
 */
@Injectable()
export class HttpTransportBackend implements Backend<HttpRequest, HttpEvent> {

    /**
     * handle client request
     * @param req 
     */
    handle(req: HttpRequest): Observable<HttpEvent> {
        const context = req.context;
        const session = context.get(ClientTransportSession);

        let obs$: Observable<any>;
        switch (req.observe) {
            case 'emit':
                obs$ = session.send(req).pipe(take(1));
                break;
            case 'observe':
                obs$ = session.request(req);
                break;
            default:
                obs$ = session.request(req).pipe(take(1))
                break;
        }

        return obs$;

    }
}
