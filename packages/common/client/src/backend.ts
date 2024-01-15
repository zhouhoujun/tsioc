import { Injectable } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import {
    OutgoingHeaders, ResHeaders, ResponseEventFactory, StatusCode, TransportErrorResponse, TransportEvent,
    TransportHeaderResponse, TransportRequest, TransportResponse
} from '@tsdi/common';
import { Observable, take } from 'rxjs';
import { ClientTransportSession } from './transport/session';


/**
 * transport response event factory.
 */
@Injectable()
export class TransportResponseEventFactory implements ResponseEventFactory<TransportEvent, TransportErrorResponse> {
    createErrorResponse(options: { url?: string; headers?: ResHeaders | OutgoingHeaders; status?: StatusCode; error?: any; statusText?: string; statusMessage?: string; }): TransportErrorResponse {
        return new TransportErrorResponse(options);
    }
    createHeadResponse(options: { url?: string; ok?: boolean; headers?: ResHeaders | OutgoingHeaders; status?: StatusCode; statusText?: string; statusMessage?: string; }): TransportEvent {
        return new TransportHeaderResponse(options) as TransportEvent;
    }
    createResponse(options: { url?: string; ok?: boolean; headers?: ResHeaders | OutgoingHeaders; status?: StatusCode; statusText?: string; statusMessage?: string; body?: any; payload?: any; }): TransportEvent {
        return new TransportResponse(options) as TransportEvent;
    }
}


/**
 * transport client endpoint backend.
 */
@Injectable()
export class TransportBackend implements Backend<TransportRequest, TransportEvent> {

    /**
     * handle client request
     * @param req 
     */
    handle(req: TransportRequest): Observable<TransportEvent> {

        const session = req.session as ClientTransportSession;

        let obs$: Observable<TransportEvent>;
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
