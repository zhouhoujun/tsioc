import { ResponseEvent, UrlRequest } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { Observable, map, take } from 'rxjs';
import { ClientBackend } from '../backend';
import { ClientTransportSession } from '../session';

@Injectable()
export class ClientTransportBackend extends ClientBackend {

    handle(req: UrlRequest<any>): Observable<ResponseEvent> {
        const session = req.context.get(ClientTransportSession);

        let obs$: Observable<ResponseEvent>;
        switch (req.observe) {
            case 'emit':
                obs$ = session.send(req).pipe(take(1), map(v=> v as any));
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