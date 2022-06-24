import { EndpointBackend, InterceptorInst, RequestBase, RequstOption, TransportClient } from '@tsdi/core';
import { Token } from '@tsdi/ioc';


export class NatsClient extends TransportClient {
    protected getInterceptorsToken(): Token<InterceptorInst<RequestBase<any>, any>[]> {
        throw new Error('Method not implemented.');
    }
    protected getBackend(): EndpointBackend<RequestBase<any>, any> {
        throw new Error('Method not implemented.');
    }
    protected buildRequest(url: string | RequestBase<any>, options?: RequstOption | undefined): RequestBase<any> {
        throw new Error('Method not implemented.');
    }
    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
