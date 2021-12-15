import { AbstractClient, ReadPacket, WritePacket } from '@tsdi/core';
import { Observable } from 'rxjs';


export class GrpcClient extends AbstractClient {
    
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
