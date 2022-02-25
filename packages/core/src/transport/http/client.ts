import { Injectable } from '@tsdi/ioc';
import { TransportClient } from '../client';
import { TransportRequest, TransportResponse } from '../packet';
import { HttpHandler } from './handler';



@Injectable()
export class HttpClient extends TransportClient {
    
    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected publish(req: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: TransportResponse<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    constructor(readonly handler: HttpHandler) {
        super();
    }

}