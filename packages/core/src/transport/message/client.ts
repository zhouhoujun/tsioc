import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ClientFactory, ClientOption } from '../client/factory';
import { TransportBackend, TransportHandler } from '../handler';
import { Protocol, ReadPacket, WritePacket } from '../packet';
import { TransportClient } from '../client/client';
import { InterceptingHandler } from '../intercepting';

@Injectable()
export class MessageClinet extends TransportClient {

    constructor(readonly handler: TransportHandler) {
        super();
    }

    connect(): Promise<any> {
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
                // { provide: TransportBackend, useClass: },
                { provide: TransportHandler, useClass: InterceptingHandler }
            ],
            ...options
        });
        return context.resolve(TransportClient);
    }

}