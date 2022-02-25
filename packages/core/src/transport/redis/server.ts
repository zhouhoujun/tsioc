import { TransportHandler } from '../handler';
import { TransportRequest, TransportResponse } from '../packet';
import { TransportServer } from '../server';

export class RedisServer extends TransportServer {
    get handler(): TransportHandler<TransportRequest<any>, TransportResponse<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
