import { Injectable } from '@tsdi/ioc';
import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Observable } from 'rxjs';
import { NatsHandler } from './handler';


@Injectable({ static: false })
export class NatsClient extends Client<TransportRequest, TransportEvent> {

    constructor(readonly handler: NatsHandler) {
        super()
    }

    protected connect(): Promise<any> | Observable<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
