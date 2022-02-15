import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ClientFactory, ClientOption } from './factory';
import { TransportBackend } from '../handler';
import { Protocol, ReadPacket, WritePacket } from '../packet';
import { TransportClient } from './client';
import { ClientTransportBackend } from './backend';

@Injectable()
export class MessageClinetTransportBackend extends ClientTransportBackend<ReadPacket, WritePacket> {
    
    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    isEvent(req: ReadPacket<any>): boolean {
        throw new Error('Method not implemented.');
    }

    protected publish(req: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }

    protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

    get protocol(): Protocol {
        return 'msg';
    }

    async close(): Promise<any> {
        
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
                { provide: TransportBackend, useClass: MessageClinetTransportBackend }
            ],
            ...options
        });
        return context.resolve(TransportClient);
    }

}