import { ClientContext, Transformor, TransportRequest, TransportStrategy } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Connection } from '../connection';
import { TransportClientOpts } from './options';


@Abstract()
export abstract class ClientTransformor extends Transformor {

    abstract createConnection(opts: TransportClientOpts): Connection;

    abstract send(req: TransportRequest, context: ClientContext): Observable<any>;
}

@Abstract()
export abstract class ClientTransportStrategy extends TransportStrategy {
    abstract get transformor(): ClientTransformor;
}
