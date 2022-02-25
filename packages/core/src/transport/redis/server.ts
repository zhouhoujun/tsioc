import { TransportHandler } from '../handler';
import { ReadPacket, WritePacket } from '../packet';
import { TransportServer } from '../server';

export class RedisServer extends TransportServer {
    get handler(): TransportHandler<ReadPacket<any>, WritePacket<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
