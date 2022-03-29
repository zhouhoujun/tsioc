import { TransportClient } from '../client';
import { TransportHandler } from '../handler';
import { TransportRequest, TransportResponse } from '../packet';


export class RedisClient extends TransportClient {
    get handler(): TransportHandler<TransportRequest<any>, TransportResponse<any>> {
        throw new Error('Method not implemented.');
    }
    
    connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected publish(packet: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: TransportRequest<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

}
