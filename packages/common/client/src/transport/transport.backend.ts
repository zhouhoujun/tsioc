import { Injectable } from '@tsdi/ioc';
import { ResponseEvent, AbstractRequest } from '@tsdi/common';
import { first, Observable } from 'rxjs';
import { RequestBackend } from '../backend';
import { ClientTransport } from './transport';

@Injectable()
export class RequestTransportBackend extends RequestBackend {

    handle(req: AbstractRequest<any>): Observable<ResponseEvent<any>> {
        const transport = req.context.get(ClientTransport)!;

        let obs$: Observable<ResponseEvent<any>>;
        switch (req.observe) {
            case 'emit':
                obs$ = transport.send(req).pipe(first());
                break;
            case 'observe':
                obs$ = transport.request(req);
                break;
            default:
                obs$ = transport.request(req).pipe(first())
                break;
        }
        return obs$;
    }

}