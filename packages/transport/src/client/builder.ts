import { Client } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ClientSession, ClientSessionOpts } from './session';


@Abstract()
export abstract class ClientBuilder<T extends Client = Client> {
    abstract build(transport: T, opts: ClientSessionOpts): Observable<ClientSession>;
}
