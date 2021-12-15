import { AbstractClient } from '@tsdi/core';
import { ReadPacket, WritePacket } from 'packages/core/src/trasport/packet';

export class MQTTClient extends AbstractClient {
    
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
