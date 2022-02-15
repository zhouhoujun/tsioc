import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ClientFactory, ClientOption } from './factory';
import { TransportBackend } from '../handler';
import { Protocol, ReadPacket, WritePacket } from '../packet';
import { TransportClient } from './client';

@Injectable()
export class MessageTransportBackend extends TransportBackend<ReadPacket, WritePacket> {

    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }

    handle(req: ReadPacket<any>): Observable<WritePacket<any>> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<any> {
        throw new Error('Method not implemented.');
    }

}

@Injectable()
export class MessageClientFactory extends ClientFactory {

    constructor(private injector: Injector) {
        super();
    }
    create(options: ClientOption): TransportClient {
        const context = InvocationContext.create(this.injector, {
            providers: [
                { provide: TransportBackend, useClass: MessageTransportBackend }
            ],
            ...options
        });
        return context.resolve(TransportClient);
    }

}