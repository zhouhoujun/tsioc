import { EndpointBackend, RequestBase, RequstOption, TransportClient } from '@tsdi/core';
import { Token } from '@tsdi/ioc';


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
