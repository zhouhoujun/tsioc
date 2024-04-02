import { Injectable } from '@tsdi/ioc';
import { TransportBackend } from '../backend';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { Observable, catchError, take, throwError } from 'rxjs';
import { ClientTransportSession } from '../session';

@Injectable()
export class TransportCodingsBackend extends TransportBackend {

    handle(req: TransportRequest<any>): Observable<TransportEvent> {
        const session = req.context.get(ClientTransportSession);

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
        return obs$.pipe(
            catchError((err, caught) => {
                return throwError(() => ({ ...req, error: err, status: err.status ?? err.statusCode, statusText: err.message }))
            })
        );
    }

}