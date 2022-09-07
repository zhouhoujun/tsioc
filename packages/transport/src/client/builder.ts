import { IncomingHeaders, RequestOptions } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportClient } from './client';
import { Pattern } from './options';
import { ClientSession, ClientSessionOpts } from './session';
import { ClientStream } from './stream';


@Abstract()
export abstract class ClientBuilder {
    abstract build(transport: TransportClient, opts: ClientSessionOpts): Observable<ClientSession>;
    abstract buildRequest(pattern: Pattern, options?: RequestOptions): any;
    abstract request(connection: ClientSession, headers: IncomingHeaders, options: any): ClientStream;
}
