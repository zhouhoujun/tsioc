import { Injectable } from '@tsdi/ioc';
import { TransportRequest, TransportResponse } from '../packet';
import { TransportClient } from '../client';
import { TransportHandler } from '../handler';

@Injectable()
export class WSClient extends TransportClient {

    get handler(): TransportHandler<TransportRequest<any>, TransportResponse<any>> {
        throw new Error('Method not implemented.');
    }
    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected publish(req: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: TransportResponse<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    
}
