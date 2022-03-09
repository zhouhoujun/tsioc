import { TransportClient, TransportRequest, TransportResponse, Protocol, TransportHandler } from '@tsdi/core';
import { Observable } from 'rxjs';


export class GrpcClient extends TransportClient {
    get protocol(): Protocol {
        throw new Error('Method not implemented.');
    }
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
