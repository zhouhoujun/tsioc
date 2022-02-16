
import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ServerFactory, ServerOption } from './factory';
import { TransportBackend } from '../handler';
import { Protocol, ReadPacket, WritePacket } from '../packet';
import { TransportServer } from './server';
import { ServerTransportBackend } from './backend';

@Injectable()
export class MessageServerTransportBackend extends ServerTransportBackend<ReadPacket, WritePacket> {
    
    startup(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    protected isEvent(req: ReadPacket<any>): boolean {
        return req.event === true;
    }

    protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
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
export class MessageServerFactory extends ServerFactory {

    constructor(private injector: Injector) {
        super();
    }
    create(options: ServerOption): TransportServer {
        const context = InvocationContext.create(this.injector, {
            providers: [
                { provide: TransportBackend, useClass: MessageServerTransportBackend }
            ],
            ...options
        });
        return context.resolve(TransportServer);
    }

}