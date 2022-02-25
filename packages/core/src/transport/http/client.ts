import { Injectable } from '@tsdi/ioc';
import { TransportHandler } from '../handler';
import { TransportClient } from '../client';
import { ReadPacket, WritePacket } from '../packet';



@Injectable()
export class HttpClient extends TransportClient {
    
    connect(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected publish(req: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: WritePacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    constructor(readonly handler: TransportHandler) {
        super();
    }

}