import { TransportClient, RequestPacket, ResponsePacket } from '@tsdi/core';


export class TCPClient extends TransportClient {
    
    connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected publish(packet: RequestPacket<any>, callback: (packet: ResponsePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: RequestPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

}
