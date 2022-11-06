import { EndpointBackend} from '@tsdi/core';
import { Token } from '@tsdi/ioc';
import { TransportClient } from '@tsdi/transport';

export class NatsClient extends TransportClient {
    
    protected buildRequest(url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }

}
