import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { TransportClient, ClientFactory, ClientOption } from '../client';
import { TransportBackend, TransportHandler } from '../handler';
import { Protocol, TransportRequest, TransportResponse } from '../packet';

@Injectable()
export class MessageClinet extends TransportClient {

    constructor(readonly handler: TransportHandler) {
        super();
    }

    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    protected publish(req: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }

    protected dispatchEvent<T = any>(packet: TransportRequest<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

    get protocol(): Protocol {
        return 'msg';
    }

    async close(): Promise<any> {

    }

}
