import { TransportClient, ReadPacket, WritePacket } from '@tsdi/core';


export class RedisClient extends TransportClient {
    
    connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

}
