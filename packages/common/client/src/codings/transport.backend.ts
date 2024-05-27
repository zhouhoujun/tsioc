import { Injectable } from '@tsdi/ioc';
import { UrlRequest, ResponseEvent } from '@tsdi/common';
import { Observable, take } from 'rxjs';
import { TransportBackend } from '../backend';
import { ClientTransportSession } from '../session';

@Injectable()
export class CodingsTransportBackend extends TransportBackend {

    handle(req: UrlRequest<any>): Observable<ResponseEvent> {
        const session = req.context.get(ClientTransportSession);

        let obs$: Observable<ResponseEvent>;
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