
import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ServerFactory, ServerOption } from '../server';
import { TransportBackend, TransportHandler } from '../handler';
import { Protocol, TransportRequest, TransportResponse } from '../packet';
import { TransportServer } from '../server';

@Injectable()
export class MessageServer extends TransportServer<TransportRequest, TransportResponse> {
    
    constructor(readonly handler: TransportHandler) {
        super();
    }
    
    
    startup(): Promise<any> {
        throw new Error('Method not implemented.');
    }

    protected isEvent(req: TransportRequest<any>): boolean {
        return req.event === true;
    }

    protected publish(packet: TransportRequest<any>, callback: (packet: TransportResponse<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }

    protected dispatchEvent<T = any>(packet: TransportRequest<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }

    get protocol(): Protocol {
        return 'msg';
    }

    async close(): Promise<any> {
        
    }

}
