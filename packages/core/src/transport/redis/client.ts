import { TransportClient } from '../client';
import { TransportHandler } from '../handler';
import { ReadPacket, WritePacket } from '../packet';


export class RedisClient extends TransportClient {
    get handler(): TransportHandler<ReadPacket<any>, WritePacket<any>> {
        throw new Error('Method not implemented.');
    }
    
    connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

}
