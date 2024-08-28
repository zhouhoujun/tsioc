import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { Observable, take, timeout } from 'rxjs';
import { ClientBackend } from '../backend';
import { ClientTransportSession } from '../session';

@Injectable()
export class ClientTransportBackend extends ClientBackend {

    handle(req: AbstractRequest<any>): Observable<ResponseEvent<any>> {
        const session = req.context.get(ClientTransportSession);

        let obs$: Observable<ResponseEvent<any>>;
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
        return req.timeout? obs$.pipe(timeout(req.timeout)) :  obs$;
    }

}