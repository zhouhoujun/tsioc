import { TransportClient, ReadPacket, WritePacket, Protocol, TransportHandler } from '@tsdi/core';
import { Observable } from 'rxjs';


export class GrpcClient extends TransportClient {
    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }
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
