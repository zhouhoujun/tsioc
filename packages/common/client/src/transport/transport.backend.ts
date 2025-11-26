import { Injectable } from '@tsdi/ioc';
import { ResponseEvent, AbstractRequest, RequestContext } from '@tsdi/common';
import { first, Observable } from 'rxjs';
import { RequestBackend } from '../backend';
import { ClientTransport } from './transport';

@Injectable()
export class RequestTransportBackend extends RequestBackend {

    handle(req: AbstractRequest<any>, context: RequestContext): Observable<ResponseEvent<any>> {
        const transport = context.get(ClientTransport)!;

        let obs$: Observable<ResponseEvent<any>>;
        switch (req.observe) {
            case 'emit':
                obs$ = transport.send(req, context).pipe(first());
                break;
            case 'observe':
                obs$ = transport.request(req, context);
                break;
            default:
                obs$ = transport.request(req, context).pipe(first())
                break;
        }
        return obs$;
    }

}