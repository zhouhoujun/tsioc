import { IncomingHeaders } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportClient } from './client';
import { ClientSession, ClientSessionOpts } from './session';
import { ClientStream } from './stream';


@Abstract()
export abstract class ClientBuilder<T extends TransportClient = TransportClient> {
    abstract build(transport: T, opts: ClientSessionOpts): Observable<ClientSession>;
    abstract request(connection: ClientSession, headers: IncomingHeaders, options: any): ClientStream;
}
