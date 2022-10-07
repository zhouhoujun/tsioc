import { Transformer } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportClientOpts } from './client';
import { Connection } from './connection';

@Abstract()
export abstract class ClientTransformer extends Transformer {
    abstract onConnection(opts: TransportClientOpts): Observable<Connection>;
}


@Abstract()
export abstract class ServerTransformer extends Transformer {
    abstract onConnection(opts: any, server?: any): Observable<Connection>;
}
