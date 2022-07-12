import { EndpointBackend, RequestContext, RequstOption, TransportClient } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';

@Injectable()
export class RedisClient extends TransportClient {
    
    protected buildRequest(context: RequestContext, url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }


}
